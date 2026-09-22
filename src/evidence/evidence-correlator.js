import { logger } from '../utils/logger.js';
import { addEvidence } from './evidence.service.js';
import { getCpuEvidence, getMemoryEvidence } from './metrics.service.js';
import { getPodLogs } from './logs.service.js';
import { getKubernetesEventEvidence } from './kubernetes-events.service.js';

/**
 * Orchestrates fetching evidence from multiple sources for an incident and saving references.
 */
export async function correlateEvidenceForIncident(incident) {
  logger.info(`Starting evidence collection for incident ${incident.id}`);
  const now = Date.now();
  // Gather evidence from 1 hour before the incident to now
  const timeStart = new Date(now - 3600000).toISOString();
  const timeEnd = new Date(now).toISOString();

  // If incident has a pod, gather pod logs and metrics
  if (incident.pod && incident.affected_service) {
    try {
      // 1. Pod Logs
      const logsQuery = `{pod=~"${incident.pod}.*"}`;
      await addEvidence(
        incident.id, 
        'loki', 
        logsQuery, 
        timeStart, 
        timeEnd, 
        `Logs for pod ${incident.pod}`
      );

      // 2. Kubernetes Events
      const events = await getKubernetesEventEvidence(
        incident.environment, // assuming namespace maps to environment
        incident.pod,
        'Pod'
      );
      
      if (events.length > 0) {
        await addEvidence(
          incident.id,
          'kubernetes',
          `Events for pod ${incident.pod}`,
          timeStart,
          timeEnd,
          `${events.length} events found`,
          { events }
        );
      }
    } catch (e) {
      logger.warn(`Failed to collect pod evidence for incident ${incident.id}`, { error: e.message });
    }
  }

  // If incident has a node, gather node-level metrics
  if (incident.node) {
    try {
      // CPU
      const cpuQuery = `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle", instance=~"${incident.node}.*"}[5m])) * 100)`;
      await addEvidence(
        incident.id,
        'prometheus',
        cpuQuery,
        timeStart,
        timeEnd,
        `CPU metrics for node ${incident.node}`
      );

      // Memory
      const memQuery = `100 * (1 - ((node_memory_MemAvailable_bytes{instance=~"${incident.node}.*"} or (node_memory_Buffers_bytes{instance=~"${incident.node}.*"} + node_memory_Cached_bytes{instance=~"${incident.node}.*"} + node_memory_MemFree_bytes{instance=~"${incident.node}.*"})) / node_memory_MemTotal_bytes{instance=~"${incident.node}.*"}))`;
      await addEvidence(
        incident.id,
        'prometheus',
        memQuery,
        timeStart,
        timeEnd,
        `Memory metrics for node ${incident.node}`
      );
    } catch (e) {
      logger.warn(`Failed to collect node evidence for incident ${incident.id}`, { error: e.message });
    }
  }
}
