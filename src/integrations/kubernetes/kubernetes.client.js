import k8s from '@kubernetes/client-node';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

let kc = new k8s.KubeConfig();

export function getKubeConfig() {
  if (config.kubernetes.inCluster) {
    kc.loadFromCluster();
  } else if (config.kubernetes.kubeconfigPath) {
    kc.loadFromFile(config.kubernetes.kubeconfigPath);
  } else {
    // Default fallback to default kubeconfig
    kc.loadFromDefault();
  }
  return kc;
}

// Initial configuration
try {
  getKubeConfig();
} catch (error) {
  logger.warn('Failed to load initial Kubernetes config, integrations may fail', { error: error.message });
}

export const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
export const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
export const eventsV1Api = kc.makeApiClient(k8s.EventsV1Api);
