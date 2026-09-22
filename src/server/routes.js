import { handleIncomingAlert } from '../incidents/incident.detector.js';
import { getIncident } from '../incidents/incident.service.js';
import { correlateEvidenceForIncident } from '../evidence/evidence-correlator.js';
import { logger } from '../utils/logger.js';

/**
 * Normalize Grafana or manual alert payloads into the internal alert shape.
 */
export function normalizeAlert(body = {}) {
  if (body.name || body.service) {
    return {
      name: body.name || 'manual_alert',
      severity: body.severity || 'warning',
      environment: body.environment || 'local',
      service: body.service || body.app || 'unknown',
      pod: body.pod || null,
      node: body.node || body.instance || null,
      type: body.type || 'system_alert',
      status: body.status || 'firing',
      annotations: body.annotations || {
        description: body.description || body.summary || 'Manual core-flow alert'
      }
    };
  }

  const labels = body.labels || {};
  const annotations = body.annotations || {};
  return {
    name: labels.alertname || body.alertname || 'grafana_alert',
    severity: labels.severity || 'warning',
    environment: labels.environment || 'unknown',
    service: labels.service || labels.app || 'unknown',
    pod: labels.pod || null,
    node: labels.instance || labels.node || null,
    type: labels.type || 'system_alert',
    status: body.status || 'firing',
    annotations
  };
}

/**
 * Core flow: create/correlate incident and attach evidence (stub when Grafana disabled).
 */
export async function processNormalizedAlert(alert) {
  const { incidentId, isNew } = await handleIncomingAlert(alert);
  if (!incidentId) {
    return { incidentId: null, isNew: false };
  }

  if (isNew) {
    const incident = await getIncident(incidentId);
    await correlateEvidenceForIncident(incident, alert);
    logger.info(`Core pipeline finished for ${incidentId}`);
  }

  return { incidentId, isNew, alert };
}

export function registerRoutes(app) {
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/vps-health', async (req, res) => {
    try {
      const { getVpsHealthSummary } = await import('../health/vps.health.js');
      const environment = req.query.environment || 'production';
      const summary = await getVpsHealthSummary(environment);
      res.status(200).json(summary);
    } catch (error) {
      logger.error('vps-health failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Phase 1 core-flow trigger (no Grafana).
   * Body: { name, severity, environment, service, pod, node, description }
   */
  app.post('/webhooks/manual', async (req, res) => {
    try {
      const alert = normalizeAlert(req.body || {});
      const result = await processNormalizedAlert(alert);
      res.status(200).json({
        status: 'processed',
        source: 'manual',
        ...result
      });
    } catch (error) {
      logger.error('Error processing manual webhook', { error: error.message });
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  app.post('/webhooks/grafana', async (req, res) => {
    try {
      const alerts = req.body.alerts || [req.body];
      const results = [];

      for (const raw of alerts) {
        const alert = normalizeAlert(raw);
        const result = await processNormalizedAlert(alert);
        results.push({ alert: alert.name, ...result });
      }

      res.status(200).json({ status: 'processed', results });
    } catch (error) {
      logger.error('Error processing Grafana webhook', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/webhooks/zoho/actions', (req, res) => {
    res.status(200).send({});
  });
}
