import { grafanaRequest } from './grafana.client.js';
import { config } from '../../config/index.js';

/**
 * Queries Tempo traces from Grafana Cloud.
 * Note: Trace API might vary depending on Grafana Cloud configuration.
 * @param {string} traceId 
 */
export async function getTrace(traceId) {
  const dsUid = config.grafana.tracesDatasourceUid; // Assuming this exists in config
  if (!dsUid) {
    throw new Error('Grafana traces datasource UID is not configured');
  }

  return grafanaRequest(`/api/datasources/proxy/uid/${dsUid}/api/traces/${traceId}`);
}
