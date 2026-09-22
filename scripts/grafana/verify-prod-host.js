/**
 * Verify production host Alloy metrics/journal (no token print).
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

const promBase = (process.env.GRAFANA_PROMETHEUS_URL || '').replace(/\/api\/prom\/push\/?$/, '');
const lokiBase = (process.env.GRAFANA_LOKI_URL || '').replace(/\/loki\/api\/v1\/push\/?$/, '');
const promAuth =
  'Basic ' +
  Buffer.from(`${process.env.GRAFANA_PROMETHEUS_USERNAME}:${process.env.GRAFANA_API_TOKEN}`).toString(
    'base64'
  );
const lokiAuth =
  'Basic ' +
  Buffer.from(`${process.env.GRAFANA_LOKI_USERNAME}:${process.env.GRAFANA_API_TOKEN}`).toString('base64');

async function prom(q) {
  const url = `${promBase}/api/prom/api/v1/query?query=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Authorization: promAuth } });
  const j = await r.json();
  const result = j?.data?.result || [];
  return {
    http: r.status,
    series: result.length,
    sample: result[0]?.metric || null,
    value: result[0]?.value?.[1] || null
  };
}

async function loki(q) {
  const end = BigInt(Date.now()) * 1000000n;
  const start = end - 30n * 60n * 1000000000n;
  const url = `${lokiBase}/loki/api/v1/query_range?query=${encodeURIComponent(q)}&start=${start}&end=${end}&limit=20`;
  const r = await fetch(url, { headers: { Authorization: lokiAuth } });
  const j = await r.json();
  const streams = j?.data?.result || [];
  return {
    http: r.status,
    streams: streams.length,
    lines: streams.reduce((n, s) => n + (s.values?.length || 0), 0)
  };
}

const up = await prom('up{job="node",environment="production"}');
const mem = await prom(
  'node_memory_MemAvailable_bytes{environment="production"}'
);
const journal = await loki(
  '{environment="production",job=~"systemd-journal|loki.source.journal.host_logs"}'
);

let vpsHealth = null;
try {
  const hr = await fetch('http://localhost:3000/api/vps-health?environment=production');
  vpsHealth = await hr.json();
} catch (e) {
  vpsHealth = { error: e.message };
}

const pass =
  up.series > 0 &&
  mem.series > 0 &&
  journal.http === 200 &&
  (journal.lines > 0 || journal.streams > 0);

console.log(
  JSON.stringify(
    {
      pass,
      up,
      mem,
      journal,
      vpsHealth: {
        status: vpsHealth?.status,
        anyUp: vpsHealth?.reachability?.anyUp,
        silent: vpsHealth?.reachability?.silent,
        memPct: vpsHealth?.hostMemory?.minAvailablePercent
      },
      dashboard:
        'https://mellowiguana2829.grafana.net/d/am-blackbox-vps-host?var-environment=production'
    },
    null,
    2
  )
);
process.exit(pass ? 0 : 2);
