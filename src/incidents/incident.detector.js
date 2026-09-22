import { logger } from '../utils/logger.js';
import { createIncident, addIncidentEvent } from './incident.service.js';
import { correlateAlert } from './incident.correlator.js';

/**
 * Convert incoming signals/alerts into candidate incidents.
 * Deduplicates and correlates before creating a new incident.
 */
export async function handleIncomingAlert(alert) {
  logger.info('Received new alert signal', { alertName: alert.name, service: alert.service });

  if (alert.status && alert.status !== 'firing') {
    logger.info(`Ignoring alert because status is ${alert.status}`);
    return { incidentId: null, isNew: false };
  }

  // 1. Check if this alert correlates to an existing open incident
  const correlatedIncidentId = await correlateAlert(alert);

  if (correlatedIncidentId) {
    logger.info(`Alert correlated to existing incident ${correlatedIncidentId}`);
    await addIncidentEvent(
      correlatedIncidentId,
      'alert_received',
      `Correlated alert: ${alert.name}`,
      alert
    );
    return { incidentId: correlatedIncidentId, isNew: false };
  }

  // 2. If no correlation, create a new incident
  const newIncident = await createIncident({
    environment: alert.environment || 'unknown',
    severity: alert.severity || 'warning',
    type: alert.type || 'system_alert',
    title: `[${alert.severity?.toUpperCase()}] ${alert.name}`,
    affected_service: alert.service,
    pod: alert.pod,
    node: alert.node,
    suspected_cause: alert.annotations?.description
  });

  await addIncidentEvent(
    newIncident.id,
    'incident_created',
    `Incident created from alert: ${alert.name}`,
    alert
  );

  return { incidentId: newIncident.id, isNew: true };
}
