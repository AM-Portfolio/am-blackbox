/**
 * Inspect kubernetes-events sample lines (no secrets printed).
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

const base = (process.env.GRAFANA_LOKI_URL || '').replace(/\/loki\/api\/v1\/push\/?$/, '');
const auth =
  'Basic ' +
  Buffer.from(`${process.env.GRAFANA_LOKI_USERNAME}:${process.env.GRAFANA_API_TOKEN}`).toString('base64');

const end = BigInt(Date.now()) * 1000000n;
const start = end - 6n * 60n * 60n * 1000000000n; // 6h

async function query(q, limit = 30) {
  const url = `${base}/loki/api/v1/query_range?query=${encodeURIComponent(q)}&start=${start}&end=${end}&limit=${limit}`;
  const r = await fetch(url, { headers: { Authorization: auth } });
  const j = await r.json();
  const streams = j?.data?.result || [];
  const lines = [];
  for (const s of streams) {
    for (const [ts, line] of s.values || []) {
      lines.push({ labels: s.stream, ts, line: line.slice(0, 400) });
    }
  }
  return { http: r.status, streams: streams.length, lines: lines.slice(0, 15) };
}

const queries = [
  '{environment="nonprod",job="kubernetes-events"}',
  '{environment="nonprod",job="kubernetes-events"} |= "OOM"',
  '{environment="nonprod",job="kubernetes-events"} |= "OOMKilled"',
  '{environment="nonprod",job="kubernetes-events"} |= "Killing"',
  '{environment="nonprod",job="kubernetes-events"} |= "Failed"',
  '{environment="nonprod",job="kubernetes-events"} |~ "(?i)oom|memory|kill|evict"',
  '{job="kubernetes-events"} |~ "(?i)oom"',
  '{environment="nonprod"} |~ "(?i)OOMKilled"'
];

for (const q of queries) {
  const r = await query(q);
  console.log(JSON.stringify({ q, http: r.http, streams: r.streams, sampleCount: r.lines.length, samples: r.lines.slice(0, 3) }, null, 2));
}
