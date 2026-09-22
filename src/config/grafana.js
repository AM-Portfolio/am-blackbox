export const grafanaConfig = {
  url: process.env.GRAFANA_URL,
  apiToken: process.env.GRAFANA_API_TOKEN,
  metricsDatasourceUid: process.env.GRAFANA_METRICS_DATASOURCE_UID,
  logsDatasourceUid: process.env.GRAFANA_LOGS_DATASOURCE_UID,
  tracesDatasourceUid: process.env.GRAFANA_TRACES_DATASOURCE_UID
};
