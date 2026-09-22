export const grafanaConfig = {
  disabled: String(process.env.GRAFANA_DISABLED || 'false').toLowerCase() === 'true',
  url: process.env.GRAFANA_URL,
  /** Cloud access policy (glc_) — Prom/Loki basic auth */
  apiToken: process.env.GRAFANA_API_TOKEN,
  /** Stack service account (glsa_) — Grafana HTTP API; falls back to apiToken */
  saToken: process.env.GRAFANA_SA_TOKEN || process.env.GRAFANA_API_TOKEN,
  saName: process.env.GRAFANA_SA_NAME || 'blackbox',
  metricsDatasourceUid: process.env.GRAFANA_METRICS_DATASOURCE_UID,
  logsDatasourceUid: process.env.GRAFANA_LOGS_DATASOURCE_UID,
  tracesDatasourceUid: process.env.GRAFANA_TRACES_DATASOURCE_UID,
  prometheusUrl: process.env.GRAFANA_PROMETHEUS_URL,
  prometheusUsername: process.env.GRAFANA_PROMETHEUS_USERNAME,
  lokiUrl: process.env.GRAFANA_LOKI_URL,
  lokiUsername: process.env.GRAFANA_LOKI_USERNAME
};
