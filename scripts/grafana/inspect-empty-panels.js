import { readFileSync } from 'fs';
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
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
const start = end - 6n * 60n * 60n * 1000000000n;

async function q(query, limit = 5) {
  const url = `${base}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&limit=${limit}`;
  const r = await fetch(url, { headers: { Authorization: auth } });
  const j = await r.json();
  const streams = j?.data?.result || [];
  return {
    http: r.status,
    streams: streams.length,
    lines: streams.reduce((n, s) => n + (s.values?.length || 0), 0),
    labels: streams[0]?.stream || null,
    sample: streams[0]?.values?.[0]?.[1]?.slice(0, 220) || null
  };
}

const queries = [
  '{job="systemd-journal"}',
  '{environment="nonprod",job="systemd-journal"}',
  '{environment="nonprod"} |= "systemd"',
  '{job="kubernetes-pods",environment="nonprod"}',
  '{job="kubernetes-pods",environment="nonprod"} |~ "(?i)error|fail|panic|killed|137"',
  '{environment="nonprod",job="kubernetes-events"} |~ "reason=(BackOff|Failed|Unhealthy)"'
];

for (const query of queries) {
  console.log(JSON.stringify({ query, ...(await q(query)) }));
}
