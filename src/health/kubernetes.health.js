import { config } from '../config/index.js';
import { coreV1Api } from '../integrations/kubernetes/kubernetes.client.js';
import { logger } from '../utils/logger.js';

/**
 * Checks Kubernetes API/cluster health.
 */
export async function checkKubernetesHealth() {
  if (!config.kubernetes.inCluster && !config.kubernetes.kubeconfigPath) {
    return {
      status: 'unknown',
      message: 'Kubernetes configuration not provided'
    };
  }

  try {
    const start = Date.now();
    // A lightweight call to verify connectivity
    await coreV1Api.getAPIResources();
    const latencyMs = Date.now() - start;

    return {
      status: 'healthy',
      reachable: true,
      latencyMs
    };
  } catch (error) {
    logger.warn('Kubernetes health check failed', { error: error.message });
    return {
      status: 'critical',
      reachable: false,
      error: error.message
    };
  }
}
