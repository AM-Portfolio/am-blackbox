import { logger } from '../utils/logger.js';

// In-memory store for heartbeats (to be replaced with DB/Redis later if needed)
const hostHeartbeats = new Map();
const HEARTBEAT_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Register a heartbeat from a host.
 * @param {string} hostId 
 * @param {Object} metadata 
 */
export function registerHeartbeat(hostId, metadata = {}) {
  hostHeartbeats.set(hostId, {
    lastSeen: Date.now(),
    metadata
  });
  logger.debug(`Heartbeat received from ${hostId}`);
}

/**
 * Check for stale heartbeats.
 */
export async function checkHeartbeats() {
  const now = Date.now();
  const staleHosts = [];

  for (const [hostId, data] of hostHeartbeats.entries()) {
    if (now - data.lastSeen > HEARTBEAT_TIMEOUT_MS) {
      staleHosts.push(hostId);
    }
  }

  if (staleHosts.length > 0) {
    logger.warn(`Detected ${staleHosts.length} stale host heartbeats`, { hosts: staleHosts });
    // TODO: Create an incident if a host goes completely dark
  }
}
