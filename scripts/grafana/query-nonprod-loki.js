/**
 * E2E: query Loki for environment=nonprod (no token print).
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const base = (process.env.GRAFANA_LOKI_URL || '').replace(/\/loki\/api\/v1\/push\/?$/, '');
const user = process.env.GRAFANA_LOKI_USERNAME;
const pass = process.env.GRAFANA_API_TOKEN;
const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

const endNs = BigInt(Date.now()) * 1000000n;
const startNs = endNs - 15n * 60n * 1000000000n;
const query = '{environment="nonprod"}';
const url = `${base}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${startNs}&end=${endNs}&limit=50`;

const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  console.log(JSON.stringify({ loki: 'fail', status: res.status, body: text.slice(0, 120) }));
  process.exit(1);
}

const streams = body?.data?.result || [];
const lineCount = streams.reduce((n, s) => n + (s.values?.length || 0), 0);
const sampleLabels = streams.slice(0, 3).map((s) => s.stream);

const out = {
  lokiHttp: res.status,
  streams: streams.length,
  lines: lineCount,
  sampleLabels,
  pass: res.ok && (streams.length > 0 || lineCount > 0)
};
console.log(JSON.stringify(out, null, 2));
writeFileSync(resolve(root, 'scripts/grafana/.last-loki-e2e.json'), JSON.stringify(out));
process.exit(out.pass ? 0 : 2);
