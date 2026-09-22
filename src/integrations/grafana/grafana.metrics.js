import { grafanaRequest, prometheusRequest } from './grafana.client.js';
import { config } from '../../config/index.js';

/**
 * Queries Prometheus metrics from Grafana Cloud.
 */
export async function queryMetricsRange(query, start, end, step) {
  const dsUid = config.grafana.metricsDatasourceUid;
  if (dsUid && config.grafana.url) {
    const params = new URLSearchParams({
      query,
      start: start.toString(),
      end: end.toString(),
      step: step.toString()
    });
    return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/api/v1/query_range?${params.toString()}`);
  }

  const params = new URLSearchParams({
    query,
    start: start.toString(),
    end: end.toString(),
    step: step.toString()
  });
  return prometheusRequest(`/api/v1/query_range?${params.toString()}`);
}

export async function queryMetrics(query, time) {
  const dsUid = config.grafana.metricsDatasourceUid;
  const timeParam = time ? time.toString() : (Date.now() / 1000).toString();

  if (dsUid && config.grafana.url) {
    const params = new URLSearchParams({ query, time: timeParam });
    return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/api/v1/query?${params.toString()}`);
  }

  const params = new URLSearchParams({ query, time: timeParam });
  return prometheusRequest(`/api/v1/query?${params.toString()}`);
}
