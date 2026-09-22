import { grafanaRequest, lokiRequest } from './grafana.client.js';
import { config } from '../../config/index.js';

/**
 * Queries Loki logs from Grafana Cloud.
 */
export async function queryLogsRange(query, start, end, limit = 1000) {
  const dsUid = config.grafana.logsDatasourceUid;
  const params = new URLSearchParams({
    query,
    start: start.toString(),
    end: end.toString(),
    limit: limit.toString()
  });

  if (dsUid && config.grafana.url) {
    return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/loki/api/v1/query_range?${params.toString()}`);
  }

  return lokiRequest(`/loki/api/v1/query_range?${params.toString()}`);
}
