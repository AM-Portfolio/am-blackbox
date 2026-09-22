import { queryMetricsRange, queryMetrics } from '../integrations/grafana/grafana.metrics.js';

export async function getCpuEvidence(instance, start, end, step = 15) {
  const query = `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle", instance=~"${instance}.*"}[5m])) * 100)`;
  return queryMetricsRange(query, start, end, step);
}

export async function getMemoryEvidence(instance, start, end, step = 15) {
  const query = `100 * (1 - ((node_memory_MemAvailable_bytes{instance=~"${instance}.*"} or (node_memory_Buffers_bytes{instance=~"${instance}.*"} + node_memory_Cached_bytes{instance=~"${instance}.*"} + node_memory_MemFree_bytes{instance=~"${instance}.*"})) / node_memory_MemTotal_bytes{instance=~"${instance}.*"}))`;
  return queryMetricsRange(query, start, end, step);
}
