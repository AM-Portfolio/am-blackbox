/**
 * List Grafana datasources with SA token; print name/type/uid only (no secrets).
 * Optionally rename the calling service account to GRAFANA_SA_NAME.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const base = (process.env.GRAFANA_URL || '').replace(/\/$/, '');
const sa = process.env.GRAFANA_SA_TOKEN;
const wantName = process.env.GRAFANA_SA_NAME || 'blackbox';

if (!base || !sa) {
  console.error('Missing GRAFANA_URL or GRAFANA_SA_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${sa}`,
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

const meRes = await fetch(`${base}/api/user`, { headers });
const meText = await meRes.text();
let me;
try {
  me = JSON.parse(meText);
} catch {
  console.error(JSON.stringify({ user: 'fail', status: meRes.status, body: meText.slice(0, 120) }));
  process.exit(1);
}
console.log(JSON.stringify({
  userOk: meRes.ok,
  login: me.login,
  name: me.name,
  isServiceAccount: !!me.isGrafanaAdmin || me.login?.startsWith('sa-') || me.login?.includes('service'),
  orgId: me.orgId
}, null, 2));

// Rename SA if we can resolve id from /api/serviceaccounts/search
const searchRes = await fetch(`${base}/api/serviceaccounts/search?perpage=100`, { headers });
if (searchRes.ok) {
  const search = await searchRes.json();
  const accounts = search.serviceAccounts || search || [];
  const list = Array.isArray(accounts) ? accounts : [];
  console.log(JSON.stringify({
    serviceAccounts: list.map((a) => ({ id: a.id, name: a.name, login: a.login, role: a.role }))
  }, null, 2));

  const match =
    list.find((a) => a.name === wantName) ||
    list.find((a) => String(a.login || '').includes('blackbox')) ||
    list.find((a) => me.login && String(a.login) === String(me.login));

  if (match && match.name !== wantName) {
    const patch = await fetch(`${base}/api/serviceaccounts/${match.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: wantName })
    });
    const patchBody = await patch.text();
    console.log(JSON.stringify({ rename: patch.ok ? 'ok' : 'fail', status: patch.status, from: match.name, to: wantName, body: patchBody.slice(0, 80) }));
  } else if (match) {
    console.log(JSON.stringify({ rename: 'already', name: match.name }));
  } else {
    console.log(JSON.stringify({ rename: 'skip', reason: 'could not match current SA' }));
  }
} else {
  console.log(JSON.stringify({ serviceAccounts: 'forbidden_or_fail', status: searchRes.status }));
}

const dsRes = await fetch(`${base}/api/datasources`, { headers });
const dsText = await dsRes.text();
if (!dsRes.ok) {
  console.error(JSON.stringify({ datasources: 'fail', status: dsRes.status, body: dsText.slice(0, 200) }));
  process.exit(1);
}
const datasources = JSON.parse(dsText);
const summary = datasources.map((d) => ({
  id: d.id,
  name: d.name,
  type: d.type,
  uid: d.uid,
  isDefault: d.isDefault
}));
console.log(JSON.stringify({ datasources: summary }, null, 2));

const prom =
  summary.find((d) => d.type === 'prometheus' && /grafanacloud/i.test(d.name)) ||
  summary.find((d) => d.type === 'prometheus');
const loki =
  summary.find((d) => d.type === 'loki' && /grafanacloud/i.test(d.name)) ||
  summary.find((d) => d.type === 'loki');

console.log(JSON.stringify({
  pick: {
    metricsUid: prom?.uid || null,
    metricsName: prom?.name || null,
    logsUid: loki?.uid || null,
    logsName: loki?.name || null
  }
}, null, 2));
