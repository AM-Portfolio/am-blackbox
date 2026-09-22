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

async function q(query, limit = 8) {
  const url = `${base}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&limit=${limit}`;
  const r = await fetch(url, { headers: { Authorization: auth } });
  const j = await r.json();
  const s = j?.data?.result || [];
  return {
    streams: s.length,
    lines: s.reduce((n, x) => n + (x.values?.length || 0), 0),
    jobs: [...new Set(s.map((x) => x.stream?.job).filter(Boolean))],
    sample: s[0]?.values?.[0]?.[1]?.slice(0, 200) || null
  };
}

const qs = [
  '{job="loki.source.journal.host_logs",environment="nonprod"}',
  '{job="loki.source.journal.host_logs",environment="nonprod"} |~ `(?i)oom|killed|memory|fail`',
  '{environment="nonprod"}',
  '{environment="nonprod",job=~".*pod.*"}',
  '{environment="nonprod",job=~".*kubernetes.*"}'
];

for (const query of qs) {
  console.log(JSON.stringify({ query, ...(await q(query)) }, null, 2));
}

// label values for job
const lv = `${base}/loki/api/v1/label/job/values?start=${start}&end=${end}`;
const lr = await fetch(lv, { headers: { Authorization: auth } });
const lj = await lr.json();
console.log(JSON.stringify({ jobValues: (lj.data || []).slice(0, 40) }, null, 2));
