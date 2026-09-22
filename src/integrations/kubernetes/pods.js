import { coreV1Api } from './kubernetes.client.js';

export async function getPod(namespace, name) {
  const res = await coreV1Api.readNamespacedPod(name, namespace);
  return res.body;
}

export async function listPods(namespace, labelSelector = '') {
  const res = await coreV1Api.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);
  return res.body.items;
}

export async function getPodStatus(namespace, name) {
  const pod = await getPod(namespace, name);
  const containerStatuses = pod.status?.containerStatuses || [];
  
  const restarts = containerStatuses.reduce((acc, curr) => acc + (curr.restartCount || 0), 0);
  const oomKilled = containerStatuses.some(c => 
    c.state?.terminated?.reason === 'OOMKilled' || 
    c.lastState?.terminated?.reason === 'OOMKilled'
  );
  
  const crashLoop = containerStatuses.some(c => c.state?.waiting?.reason === 'CrashLoopBackOff');

  return {
    phase: pod.status?.phase,
    restarts,
    oomKilled,
    crashLoop,
    conditions: pod.status?.conditions || []
  };
}
