/**
 * Publish grafana/dashboards/vps-host.json to the stack (SA token). Prints URL only.
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
const token = process.env.GRAFANA_SA_TOKEN;
const dash = JSON.parse(readFileSync(resolve(root, 'grafana/dashboards/vps-host.json'), 'utf8'));

if (!base || !token) {
  console.error(JSON.stringify({ publish: 'fail', reason: 'missing GRAFANA_URL or GRAFANA_SA_TOKEN' }));
  process.exit(1);
}

const payload = {
  dashboard: dash,
  overwrite: true,
  message: 'am-blackbox VPS host dashboard'
};

const res = await fetch(`${base}/api/dashboards/db`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  body: JSON.stringify(payload)
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  console.error(JSON.stringify({ publish: 'fail', status: res.status, body: text.slice(0, 200) }));
  process.exit(1);
}

if (!res.ok) {
  console.error(JSON.stringify({ publish: 'fail', status: res.status, message: body.message || body }));
  process.exit(1);
}

const url = body.url?.startsWith('http') ? body.url : `${base}${body.url || `/d/${dash.uid}`}`;
console.log(
  JSON.stringify(
    {
      publish: 'ok',
      uid: body.uid || dash.uid,
      slug: body.slug,
      url,
      status: body.status
    },
    null,
    2
  )
);
