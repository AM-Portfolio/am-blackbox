/**
 * Offender report: Blackbox DB + Grafana Cloud (Alloy → same stack Blackbox uses).
 * No SSH/kubectl to VPS.
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

const promBase = (process.env.GRAFANA_PROMETHEUS_URL || '').replace(/\/api\/prom\/push\/?$/, '');
const lokiBase = (process.env.GRAFANA_LOKI_URL || '').replace(/\/loki\/api\/v1\/push\/?$/, '');
const pAuth =
  'Basic ' +
  Buffer.from(`${process.env.GRAFANA_PROMETHEUS_USERNAME}:${process.env.GRAFANA_API_TOKEN}`).toString(
    'base64'
  );
const lAuth =
  'Basic ' +
  Buffer.from(`${process.env.GRAFANA_LOKI_USERNAME}:${process.env.GRAFANA_API_TOKEN}`).toString(
    'base64'
  );

async function prom(q) {
  const r = await fetch(`${promBase}/api/prom/api/v1/query?query=${encodeURIComponent(q)}`, {
    headers: { Authorization: pAuth }
  });
  const j = await r.json();
  return j.data?.result || [];
}

async function loki(q, hours = 12) {
  const end = BigInt(Date.now()) * 1000000n;
  const start = end - BigInt(hours) * 60n * 60n * 1000000000n;
  const r = await fetch(
    `${lokiBase}/loki/api/v1/query_range?query=${encodeURIComponent(q)}&start=${start}&end=${end}&limit=200`,
    { headers: { Authorization: lAuth } }
  );
  const j = await r.json();
  const streams = j.data?.result || [];
  const lines = [];
  for (const s of streams) {
    for (const [, line] of s.values || []) {
      lines.push({ ns: s.stream?.namespace || 'unknown', line });
    }
  }
  return lines;
}

function parseEvent(line) {
  const name = (line.match(/\bname=([^\s]+)/) || [])[1] || '?';
  const reason = (line.match(/\breason=([^\s]+)/) || [])[1] || '?';
  const count = Number((line.match(/\bcount=(\d+)/) || [])[1] || 1);
  return { name, reason, count };
}

function suspectedCause({ anyUp, memPct, cpuPct, topPods }) {
  if (!anyUp) return 'vps_unreachable';
  if (memPct != null && memPct < 15) {
    return topPods.filter((p) => p.reasons.OOMKilled || p.reasons.BackOff).length >= 2
      ? 'oom_cascade'
      : 'host_memory_exhaustion';
  }
  if (topPods.some((p) => p.reasons.OOMKilled)) return 'oom_killed';
  if (topPods.some((p) => p.reasons.BackOff || p.reasons.Unhealthy)) return 'crash_loop_or_unhealthy';
  if (topPods.some((p) => p.reasons.FailedMount)) return 'failed_mount_vault_or_volume';
  if (cpuPct != null && cpuPct > 75) return 'host_cpu_pressure';
  return 'stable_or_insufficient_signals';
}

async function bbVpsHealth(env) {
  try {
    const r = await fetch(`http://localhost:3000/api/vps-health?environment=${env}`);
    return await r.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function analyzeEnv(env) {
  const up = await prom(`up{job="node",environment="${env}"}`);
  const mem = await prom(
    `100 * (node_memory_MemAvailable_bytes{environment="${env}"} / node_memory_MemTotal_bytes{environment="${env}"})`
  );
  const cpu = await prom(
    `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle",environment="${env}"}[5m])) * 100)`
  );
  const events = await loki(
    `{environment="${env}",job="kubernetes-events"} |~ "reason=(BackOff|OOMKilled|Evicted|Unhealthy|FailedMount|Failed)"`,
    12
  );

  const byNs = {};
  const byPod = {};
  for (const e of events) {
    const p = parseEvent(e.line);
    byNs[e.ns] = (byNs[e.ns] || 0) + p.count;
    const key = `${e.ns}/${p.name}`;
    if (!byPod[key]) {
      byPod[key] = { namespace: e.ns, pod: p.name, total: 0, reasons: {} };
    }
    byPod[key].total += p.count;
    byPod[key].reasons[p.reason] = (byPod[key].reasons[p.reason] || 0) + p.count;
  }

  const topNamespaces = Object.entries(byNs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([namespace, eventWeight]) => ({ namespace, eventWeight }));
  const topPods = Object.values(byPod)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const anyUp = up.some((x) => Number(x.value?.[1]) === 1);
  const memPct = mem.length ? Math.min(...mem.map((x) => Number(x.value?.[1]))) : null;
  const cpuPct = cpu.length ? Math.max(...cpu.map((x) => Number(x.value?.[1]))) : null;
  const health = await bbVpsHealth(env);

  // #region agent log
  const crashPods = topPods.filter((p) => p.reasons.BackOff || p.reasons.Unhealthy);
  const mountPods = topPods.filter((p) => p.reasons.FailedMount);
  const oomPods = topPods.filter((p) => p.reasons.OOMKilled);
  fetch('http://127.0.0.1:7619/ingest/c2287e01-93ba-4ea0-ab36-19887309c71e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'244321'},body:JSON.stringify({sessionId:'244321',runId:'post-fix',hypothesisId:'A',location:'offender-report-blackbox.js:analyzeEnv',message:'Blackbox offline vs Grafana host up',data:{env,bbStatus:health.status,bbSilent:health.reachability?.silent,bbAnyUp:health.reachability?.anyUp,kubeReachable:health.vpsState?.reachable,kubeError:health.vpsState?.error||null,grafanaAnyUp:anyUp,notes:health.notes||null,offlineFormula:'silent_only'},timestamp:Date.now()})}).catch(()=>{});
  fetch('http://127.0.0.1:7619/ingest/c2287e01-93ba-4ea0-ab36-19887309c71e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'244321'},body:JSON.stringify({sessionId:'244321',runId:'post-fix',hypothesisId:'B',location:'offender-report-blackbox.js:analyzeEnv',message:'Host mem/cpu pressure check',data:{env,memPct:memPct!=null?Number(memPct.toFixed(1)):null,cpuPct:cpuPct!=null?Number(cpuPct.toFixed(1)):null,bbMemPressure:health.hostMemory?.pressure===true,bbMemAvail:health.hostMemory?.minAvailablePercent??null},timestamp:Date.now()})}).catch(()=>{});
  fetch('http://127.0.0.1:7619/ingest/c2287e01-93ba-4ea0-ab36-19887309c71e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'244321'},body:JSON.stringify({sessionId:'244321',runId:'post-fix',hypothesisId:'C',location:'offender-report-blackbox.js:analyzeEnv',message:'Crash-loop / Unhealthy culprits',data:{env,topNs:topNamespaces.slice(0,5),crashTop:crashPods.slice(0,8).map(p=>({ns:p.namespace,pod:p.pod,total:p.total,reasons:p.reasons}))},timestamp:Date.now()})}).catch(()=>{});
  fetch('http://127.0.0.1:7619/ingest/c2287e01-93ba-4ea0-ab36-19887309c71e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'244321'},body:JSON.stringify({sessionId:'244321',runId:'post-fix',hypothesisId:'D',location:'offender-report-blackbox.js:analyzeEnv',message:'FailedMount vault/volume culprits',data:{env,mountTop:mountPods.slice(0,8).map(p=>({ns:p.namespace,pod:p.pod,total:p.total,reasons:p.reasons}))},timestamp:Date.now()})}).catch(()=>{});
  fetch('http://127.0.0.1:7619/ingest/c2287e01-93ba-4ea0-ab36-19887309c71e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'244321'},body:JSON.stringify({sessionId:'244321',runId:'post-fix',hypothesisId:'E',location:'offender-report-blackbox.js:analyzeEnv',message:'OOM vs noise namespaces',data:{env,oomCount:oomPods.length,oomTop:oomPods.slice(0,5),monitoringWeight:(byNs.monitoring||0),kubeSystemWeight:(byNs['kube-system']||0),appsWeight:(byNs['am-apps-preprod']||0)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return {
    environment: env,
    blackboxVpsHealth: {
      status: health.status,
      anyUp: health.reachability?.anyUp,
      silent: health.reachability?.silent,
      memAvailablePct: health.hostMemory?.minAvailablePercent,
      note: health.vpsState?.error
        ? 'kube from Blackbox container unavailable (expected locally); host metrics from Grafana used'
        : null
    },
    hostFromGrafana: {
      instances: up.map((x) => x.metric.instance),
      anyUp,
      memAvailablePct: memPct != null ? Number(memPct.toFixed(1)) : null,
      cpuBusyPct: cpuPct != null ? Number(cpuPct.toFixed(1)) : null
    },
    suspectedCause: suspectedCause({ anyUp, memPct, cpuPct, topPods }),
    topNamespaces,
    topPods,
    eventLinesSampled: events.length
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  method: 'Blackbox /api/vps-health + Grafana Cloud (Alloy ingest). No VPS SSH/kubectl.',
  blackboxIncidents: null,
  environments: {}
};

try {
  const r = await fetch('http://localhost:3000/health');
  report.blackboxApi = r.ok ? 'ok' : 'degraded';
} catch (e) {
  report.blackboxApi = e.message;
}

for (const env of ['nonprod', 'production']) {
  report.environments[env] = await analyzeEnv(env);
}

const outPath = resolve(root, 'scripts/grafana/.offender-report-blackbox.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
