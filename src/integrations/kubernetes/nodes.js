import { coreV1Api } from './kubernetes.client.js';

export async function getNode(name) {
  const res = await coreV1Api.readNode(name);
  return res.body;
}

export async function listNodes() {
  const res = await coreV1Api.listNode();
  return res.body.items;
}

export async function getNodeStatus(name) {
  const node = await getNode(name);
  const conditions = node.status?.conditions || [];
  
  const isReady = conditions.find(c => c.type === 'Ready')?.status === 'True';
  const memoryPressure = conditions.find(c => c.type === 'MemoryPressure')?.status === 'True';
  const diskPressure = conditions.find(c => c.type === 'DiskPressure')?.status === 'True';
  const pidPressure = conditions.find(c => c.type === 'PIDPressure')?.status === 'True';

  return {
    isReady,
    memoryPressure,
    diskPressure,
    pidPressure,
    conditions
  };
}
