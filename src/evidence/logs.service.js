import { queryLogsRange } from '../integrations/grafana/grafana.logs.js';

export async function getPodLogs(namespace, pod, start, end, limit = 500) {
  const query = `{namespace="${namespace}", pod=~"${pod}.*"}`;
  return queryLogsRange(query, start, end, limit);
}

export async function getSystemLogs(hostname, start, end, limit = 500) {
  const query = `{hostname="${hostname}", job="systemd-journal"}`;
  return queryLogsRange(query, start, end, limit);
}
