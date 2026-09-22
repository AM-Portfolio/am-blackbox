import { coreV1Api } from './kubernetes.client.js';

/**
 * Fetch events for a specific namespace, optionally filtered by involved object.
 * @param {string} namespace 
 * @param {string} objectName 
 * @param {string} objectKind 
 */
export async function listEvents(namespace, objectName = null, objectKind = null) {
  let fieldSelector = '';
  if (objectName && objectKind) {
    fieldSelector = `involvedObject.name=${objectName},involvedObject.kind=${objectKind}`;
  }
  
  const res = await coreV1Api.listNamespacedEvent(namespace, undefined, undefined, undefined, fieldSelector);
  return res.body.items;
}
