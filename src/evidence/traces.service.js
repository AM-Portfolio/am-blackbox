import { getTrace as fetchTrace } from '../integrations/grafana/grafana.traces.js';

export async function getTraceEvidence(traceId) {
  return fetchTrace(traceId);
}
