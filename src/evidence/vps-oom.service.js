import { listPods } from '../integrations/kubernetes/pods.js';
import { listNodes, getNodeStatus } from '../integrations/kubernetes/nodes.js';
import { queryLogsRange } from '../integrations/grafana/grafana.logs.js';
import { queryMetrics } from '../integrations/grafana/grafana.metrics.js';
import { withEnvLabel, grafanaEnvironmentLabel } from './env-labels.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Scan namespaces for pods with OOMKilled container state.
 */
export async function findOomKilledPods(namespaceHint = null) {
  const offenders = [];
  const namespaces = namespaceHint ? [namespaceHint] : await listAllNamespacesSafe();

  for (const ns of namespaces) {
    let pods = [];
    try {
      pods = await listPods(ns);
    } catch (e) {
      logger.warn(`listPods failed for ${ns}`, { error: e.message });
      continue;
    }
    for (const pod of pods) {
      const statuses = pod.status?.containerStatuses || [];
      for (const c of statuses) {
        const term = c.state?.terminated || c.lastState?.terminated;
        if (term?.reason === 'OOMKilled') {
          offenders.push({
            namespace: ns,
            pod: pod.metadata?.name,
            container: c.name,
            restartCount: c.restartCount || 0,
            finishedAt: term.finishedAt || null,
            node: pod.spec?.nodeName || null
          });
        }
      }
    }
  }
  return offenders;
}

async function listAllNamespacesSafe() {
  try {
    const { coreV1Api } = await import('../integrations/kubernetes/kubernetes.client.js');
    const res = await coreV1Api.listNamespace();
    return (res.body.items || []).map((n) => n.metadata.name).filter(Boolean);
  } catch {
    return ['default'];
  }
}

/**
 * Node pressure / readiness for VPS out-of-state.
 */
export async function getClusterVpsState(nodeHint = null) {
  const nodes = [];
  try {
    if (nodeHint) {
      const status = await getNodeStatus(nodeHint);
      nodes.push({ name: nodeHint, ...status });
    } else {
      const all = await listNodes();
      for (const n of all) {
        const name = n.metadata?.name;
        const status = await getNodeStatus(name);
        nodes.push({ name, ...status });
      }
    }
  } catch (e) {
    logger.warn('getClusterVpsState failed', { error: e.message });
    return { reachable: false, error: e.message, nodes: [] };
  }

  const anyMemoryPressure = nodes.some((n) => n.memoryPressure);
  const anyDiskPressure = nodes.some((n) => n.diskPressure);
  const anyNotReady = nodes.some((n) => !n.isReady);

  return {
    reachable: true,
    anyMemoryPressure,
    anyDiskPressure,
    anyNotReady,
    nodes
  };
}

/**
 * Loki: recent OOMKilled lines for environment.
 */
export async function queryOomLogs(environment, startMs, endMs, limit = 50) {
  if (config.grafana.disabled) return { skipped: true, lines: [] };
  const env = grafanaEnvironmentLabel(environment);
  const selector = env
    ? `{environment="${env}"} |= "OOMKilled"`
    : `{job=~".+"} |= "OOMKilled"`;
  try {
    const startNs = BigInt(startMs) * 1000000n;
    const endNs = BigInt(endMs) * 1000000n;
    const raw = await queryLogsRange(selector, startNs.toString(), endNs.toString(), limit);
    const lines = flattenLoki(raw);
    return { skipped: false, query: selector, lines };
  } catch (e) {
    logger.warn('queryOomLogs failed', { error: e.message });
    return { skipped: false, error: e.message, lines: [] };
  }
}

/**
 * Prometheus: host memory available ratio (0–100 free-ish); low = pressure.
 */
export async function queryHostMemoryPressure(environment, instanceHint = null) {
  if (config.grafana.disabled) return { skipped: true };
  const env = grafanaEnvironmentLabel(environment);
  const envFilter = env ? `environment="${env}"` : '';
  const instanceFilter = instanceHint ? `instance=~"${instanceHint}.*"` : '';
  const filters = [envFilter, instanceFilter].filter(Boolean).join(',');
  const q = filters
    ? `100 * (node_memory_MemAvailable_bytes{${filters}} / node_memory_MemTotal_bytes{${filters}})`
    : `100 * (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)`;

  try {
    const raw = await queryMetrics(q);
    const values = flattenPromInstant(raw);
    const minFree = values.length ? Math.min(...values.map((v) => v.value)) : null;
    return {
      skipped: false,
      query: q,
      minAvailablePercent: minFree,
      pressure: minFree != null && minFree < 10,
      series: values
    };
  } catch (e) {
    logger.warn('queryHostMemoryPressure failed', { error: e.message });
    return { skipped: false, error: e.message, pressure: false };
  }
}

/**
 * Detect VPS silence: no recent scrapes / missing node series.
 */
export async function queryVpsReachability(environment) {
  if (config.grafana.disabled) return { skipped: true, silent: false };
  const env = grafanaEnvironmentLabel(environment);
  const q = env
    ? `up{job="node",environment="${env}"}`
    : `up{job="node"}`;
  try {
    const raw = await queryMetrics(q);
    const values = flattenPromInstant(raw);
    const anyUp = values.some((v) => v.value === 1);
    const anySeries = values.length > 0;
    return {
      skipped: false,
      query: q,
      silent: !anySeries || !anyUp,
      seriesCount: values.length,
      anyUp
    };
  } catch (e) {
    return { skipped: false, error: e.message, silent: true, kubeOrMetricsUnreachable: true };
  }
}

export function buildEnvScopedLogQuery(environment, extraLabels = {}) {
  const parts = [];
  const env = grafanaEnvironmentLabel(environment);
  if (env) parts.push(`environment="${env}"`);
  for (const [k, v] of Object.entries(extraLabels)) {
    if (v) parts.push(`${k}="${v}"`);
  }
  return withEnvLabel(`{${parts.join(',')}}`, null).replace(/environment="[^"]*",?/, (m) =>
    env ? `environment="${env}",` : ''
  );
}

function flattenLoki(raw) {
  const results = raw?.data?.result || raw?.result || [];
  const lines = [];
  for (const stream of results) {
    for (const [ts, line] of stream.values || []) {
      lines.push({ ts, line, labels: stream.stream || {} });
    }
  }
  return lines;
}

function flattenPromInstant(raw) {
  const results = raw?.data?.result || raw?.result || [];
  return results.map((r) => ({
    metric: r.metric || {},
    value: r.value ? Number(r.value[1]) : null
  }));
}
