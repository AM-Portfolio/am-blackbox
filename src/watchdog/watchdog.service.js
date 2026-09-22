import { logger } from '../utils/logger.js';
import { runPeriodicHealthChecks } from './health-check.service.js';
import { checkHeartbeats } from './heartbeat.service.js';

let watchdogInterval = null;
const WATCHDOG_INTERVAL_MS = 60000; // 1 minute

export function startWatchdog() {
  if (watchdogInterval) {
    logger.warn('Watchdog is already running');
    return;
  }

  logger.info('Starting watchdog service');
  
  watchdogInterval = setInterval(async () => {
    logger.debug('Watchdog tick');
    try {
      await Promise.allSettled([
        runPeriodicHealthChecks(),
        checkHeartbeats()
      ]);
    } catch (error) {
      logger.error('Watchdog cycle encountered an error', { error: error.message });
    }
  }, WATCHDOG_INTERVAL_MS);
}

export function stopWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info('Watchdog service stopped');
  }
}
