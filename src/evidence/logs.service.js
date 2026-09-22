import { queryLogsRange } from '../integrations/grafana/grafana.logs.js';
import { grafanaEnvironmentLabel } from './env-labels.js';

export async function getPodLogs(namespace, pod, start, end, limit = 500, environment = null) {
  const env = grafanaEnvironmentLabel(environment);
  const query = env
    ? `{environment="${env}",namespace="${namespace}",pod=~"${pod}.*"}`
    : `{namespace="${namespace}",pod=~"${pod}.*"}`;
  return queryLogsRange(query, start, end, limit);
}

export async function getSystemLogs(hostname, start, end, limit = 500, environment = null) {
  const env = grafanaEnvironmentLabel(environment);
  const query = env
    ? `{environment="${env}",hostname="${hostname}",job="systemd-journal"}`
    : `{hostname="${hostname}",job="systemd-journal"}`;
  return queryLogsRange(query, start, end, limit);
}
