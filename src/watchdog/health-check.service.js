import { logger } from '../utils/logger.js';
import { getSystemHealth } from '../health/health.service.js';

/**
 * Runs periodic health checks on the system and its dependencies.
 */
export async function runPeriodicHealthChecks() {
  logger.debug('Running periodic health checks');
  
  try {
    const health = await getSystemHealth();
    
    if (health.status !== 'healthy') {
      logger.warn('System health is degraded', { health });
      // TODO: Potentially trigger an internal incident if critical dependencies are down
    } else {
      logger.debug('System health is normal');
    }
  } catch (error) {
    logger.error('Failed to run periodic health checks', { error: error.message });
  }
}
