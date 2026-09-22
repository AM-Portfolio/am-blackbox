import { appsV1Api } from './kubernetes.client.js';

export async function getDeployment(namespace, name) {
  const res = await appsV1Api.readNamespacedDeployment(name, namespace);
  return res.body;
}

export async function listDeployments(namespace) {
  const res = await appsV1Api.listNamespacedDeployment(namespace);
  return res.body.items;
}

export async function getDeploymentStatus(namespace, name) {
  const deployment = await getDeployment(namespace, name);
  
  return {
    replicas: deployment.spec?.replicas || 0,
    readyReplicas: deployment.status?.readyReplicas || 0,
    availableReplicas: deployment.status?.availableReplicas || 0,
    unavailableReplicas: deployment.status?.unavailableReplicas || 0,
    conditions: deployment.status?.conditions || []
  };
}
