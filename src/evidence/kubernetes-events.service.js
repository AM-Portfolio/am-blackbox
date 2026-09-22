import { listEvents } from '../integrations/kubernetes/events.js';

/**
 * Retrieves Kubernetes events as evidence for an incident.
 * @param {string} namespace 
 * @param {string} objectName 
 * @param {string} objectKind 
 * @returns {Promise<Array>}
 */
export async function getKubernetesEventEvidence(namespace, objectName, objectKind) {
  const events = await listEvents(namespace, objectName, objectKind);
  
  return events.map(e => ({
    reason: e.reason,
    message: e.message,
    type: e.type,
    count: e.count,
    firstTimestamp: e.firstTimestamp,
    lastTimestamp: e.lastTimestamp
  }));
}
