import { config } from '../config/index.js';
import { checkDependenciesHealth } from './dependencies.health.js';
import { checkKubernetesHealth } from './kubernetes.health.js';
import { getVpsHealthSummary } from './vps.health.js';

/**
 * Aggregates the overall health of AM Blackbox and its dependencies.
 * @returns {Promise<Object>}
 */
export async function getSystemHealth() {
  const dependencies = await checkDependenciesHealth();
  const kubernetes = await checkKubernetesHealth();
  const vps = getVpsHealthSummary();

  const isHealthy = dependencies.status === 'healthy' && 
                    kubernetes.status !== 'critical';

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0', // Could be loaded from package.json
    components: {
      dependencies,
      kubernetes,
      vps
    }
  };
}
