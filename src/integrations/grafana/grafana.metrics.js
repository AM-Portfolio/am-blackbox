import { grafanaRequest } from './grafana.client.js';
import { config } from '../../config/index.js';

/**
 * Queries Prometheus metrics from Grafana Cloud.
 * @param {string} query PromQL query
 * @param {number} start Unix timestamp (seconds)
 * @param {number} end Unix timestamp (seconds)
 * @param {number} step Step size (seconds)
 */
export async function queryMetricsRange(query, start, end, step) {
  const dsUid = config.grafana.metricsDatasourceUid;
  if (!dsUid) {
    throw new Error('Grafana metrics datasource UID is not configured');
  }

  const params = new URLSearchParams({
    query,
    start: start.toString(),
    end: end.toString(),
    step: step.toString()
  });

  return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/api/v1/query_range?${params.toString()}`);
}

/**
 * Queries Prometheus metrics from Grafana Cloud at a single point in time.
 * @param {string} query PromQL query
 * @param {number} time Unix timestamp (seconds)
 */
export async function queryMetrics(query, time) {
  const dsUid = config.grafana.metricsDatasourceUid;
  if (!dsUid) {
    throw new Error('Grafana metrics datasource UID is not configured');
  }

  const params = new URLSearchParams({
    query,
    time: time ? time.toString() : (Date.now() / 1000).toString()
  });

  return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/api/v1/query?${params.toString()}`);
}
