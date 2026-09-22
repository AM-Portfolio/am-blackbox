import { grafanaRequest } from './grafana.client.js';
import { config } from '../../config/index.js';

/**
 * Queries Loki logs from Grafana Cloud.
 * @param {string} query LogQL query
 * @param {number} start Unix timestamp (nanoseconds)
 * @param {number} end Unix timestamp (nanoseconds)
 * @param {number} limit Max number of lines to return
 */
export async function queryLogsRange(query, start, end, limit = 1000) {
  const dsUid = config.grafana.logsDatasourceUid;
  if (!dsUid) {
    throw new Error('Grafana logs datasource UID is not configured');
  }

  const params = new URLSearchParams({
    query,
    start: start.toString(),
    end: end.toString(),
    limit: limit.toString()
  });

  return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/loki/api/v1/query_range?${params.toString()}`);
}
