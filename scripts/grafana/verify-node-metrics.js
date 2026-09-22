/**
 * Verify host Alloy node metrics in Grafana Cloud (no token print).
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

const base = (process.env.GRAFANA_PROMETHEUS_URL || '').replace(/\/api\/prom\/push\/?$/, '');
const auth =
  'Basic ' +
  Buffer.from(`${process.env.GRAFANA_PROMETHEUS_USERNAME}:${process.env.GRAFANA_API_TOKEN}`).toString(
    'base64'
  );

async function promQuery(q) {
  const url = `${base}/api/prom/api/v1/query?query=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  const result = body?.data?.result || [];
  return { status: res.status, series: result.length, sample: result.slice(0, 2).map((r) => r.metric) };
}

const queries = [
  'up{job="node",environment="nonprod"}',
  'node_memory_MemAvailable_bytes{environment="nonprod"}',
  'node_cpu_seconds_total{environment="nonprod"}'
];

const out = {};
for (const q of queries) {
  out[q] = await promQuery(q);
}

const pass =
  out['up{job="node",environment="nonprod"}'].series > 0 &&
  out['node_memory_MemAvailable_bytes{environment="nonprod"}'].series > 0;

console.log(JSON.stringify({ pass, results: out }, null, 2));
process.exit(pass ? 0 : 2);
