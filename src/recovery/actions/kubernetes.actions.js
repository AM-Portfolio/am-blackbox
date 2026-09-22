import { coreV1Api, appsV1Api } from '../../integrations/kubernetes/kubernetes.client.js';

export async function restartPod(namespace, podName) {
  // Restarting a pod usually means deleting it so a ReplicaSet/Deployment recreates it
  await coreV1Api.deleteNamespacedPod(podName, namespace);
  return { success: true, message: `Pod ${podName} deleted (restarted) in ${namespace}` };
}

export async function restartDeployment(namespace, deploymentName) {
  // To restart a deployment, we patch its template with a new annotation
  const patch = [
    {
      op: 'replace',
      path: '/spec/template/metadata/annotations/am-blackbox-restartedAt',
      value: new Date().toISOString()
    }
  ];

  const options = { headers: { 'Content-type': 'application/json-patch+json' } };
  
  await appsV1Api.patchNamespacedDeployment(
    deploymentName,
    namespace,
    patch,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    options
  );

  return { success: true, message: `Deployment ${deploymentName} rollout restarted in ${namespace}` };
}
