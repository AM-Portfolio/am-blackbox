/**
 * Verify glanceable VPS dashboard panels (no token print).
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

const stack = (process.env.GRAFANA_URL || '').replace(/\/$/, '');
const sa = process.env.GRAFANA_SA_TOKEN;
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

const dashRes = await fetch(`${stack}/api/dashboards/uid/am-blackbox-vps-host`, {
  headers: { Authorization: `Bearer ${sa}`, Accept: 'application/json' }
});
const dashBody = await dashRes.json();
const panels = dashBody?.dashboard?.panels || [];
const titles = panels.map((p) => p.title);
const refresh = dashBody?.dashboard?.refresh;

const upRes = await fetch(
  `${promBase}/api/prom/api/v1/query?query=${encodeURIComponent('up{job="node",environment="nonprod"}')}`,
  { headers: { Authorization: promAuth } }
);
const upJson = await upRes.json();
const upSeries = upJson?.data?.result?.length || 0;

const end = BigInt(Date.now()) * 1000000n;
const start = end - 60n * 60n * 1000000000n;
async function loki(q) {
  const url = `${lokiBase}/loki/api/v1/query_range?query=${encodeURIComponent(q)}&start=${start}&end=${end}&limit=20`;
  const r = await fetch(url, { headers: { Authorization: lokiAuth } });
  const j = await r.json();
  const streams = j?.data?.result || [];
  const lines = streams.reduce((n, s) => n + (s.values?.length || 0), 0);
  return { http: r.status, streams: streams.length, lines };
}

const events = await loki('{environment="nonprod",job="kubernetes-events"}');
const oomEvents = await loki('{environment="nonprod",job="kubernetes-events"} |= "OOMKilled"');
const related = await loki(
  '{environment="nonprod",job="kubernetes-events"} |~ "(?i)OOMKilled|OutOfmemory|Killing|Evicted|Failed|OOM"'
);
const journal = await loki(
  '{environment="nonprod",job="systemd-journal"} |~ "(?i)oom|out of memory|Killed process"'
);

const needTitles = [
  'How to read (glance)',
  'Node up',
  'Mem available %',
  'OOM events (1h)',
  'Suspected cause',
  'OOM offenders — which pod / why (kubernetes-events)',
  'Related kube events (Killing / Evicted / Failed / OOM)',
  'Pod logs mentioning OOMKilled',
  'Host journal — kernel OOM / killed process'
];
const missing = needTitles.filter((t) => !titles.includes(t));

const pass =
  dashRes.ok &&
  refresh === '30s' &&
  missing.length === 0 &&
  upSeries > 0 &&
  events.http === 200 &&
  oomEvents.http === 200 &&
  related.http === 200 &&
  journal.http === 200;

console.log(
  JSON.stringify(
    {
      pass,
      dashboardHttp: dashRes.ok,
      refresh,
      panelCount: panels.length,
      missingTitles: missing,
      nodeUpSeries: upSeries,
      loki: { events, oomEvents, related, journal },
      url: `${stack}/d/am-blackbox-vps-host?var-environment=nonprod`
    },
    null,
    2
  )
);
process.exit(pass ? 0 : 2);
