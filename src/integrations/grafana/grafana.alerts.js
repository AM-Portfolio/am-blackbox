import { grafanaRequest } from './grafana.client.js';

/**
 * Fetch currently firing alerts from Grafana.
 */
export async function getFiringAlerts() {
  // Uses Grafana alerting API
  return grafanaRequest('/api/prometheus/grafana/api/v1/alerts');
}

/**
 * Fetch alert rules.
 */
export async function getAlertRules() {
  return grafanaRequest('/api/ruler/grafana/api/v1/rules');
}
