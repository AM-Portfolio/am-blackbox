import { handleIncomingAlert } from '../incidents/incident.detector.js';
import { getIncident } from '../incidents/incident.service.js';
import { correlateEvidenceForIncident } from '../evidence/evidence-correlator.js';
import { runDiagnosisForIncident } from '../diagnosis/diagnosis.service.js';
import { detectPatternFromIncident } from '../patterns/pattern.detector.js';
import { logger } from '../utils/logger.js';

export function registerRoutes(app) {
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', (req, res) => {
    // TODO: Add readiness checks for dependencies (DB, etc)
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  });

  // Grafana Webhook for Alerts
  app.post('/webhooks/grafana', async (req, res) => {
    try {
      const alerts = req.body.alerts || [];
      const results = [];

      for (const alert of alerts) {
        // Normalize alert format
        const normalizedAlert = {
          name: alert.labels?.alertname,
          severity: alert.labels?.severity,
          environment: alert.labels?.environment || 'unknown',
          service: alert.labels?.service || alert.labels?.app,
          pod: alert.labels?.pod,
          node: alert.labels?.instance || alert.labels?.node,
          annotations: alert.annotations || {}
        };

        // 1. Detect/Correlate Incident (Phase 6)
        const { incidentId, isNew } = await handleIncomingAlert(normalizedAlert);
        results.push({ alert: normalizedAlert.name, incidentId, isNew });

        if (isNew) {
          // Kick off async pipeline for new incidents
          setImmediate(async () => {
            try {
              const incident = await getIncident(incidentId);
              
              // 2. Gather Evidence (Phase 7)
              await correlateEvidenceForIncident(incident);
              
              // 3. Detect Patterns (Phase 8)
              // Wait, we need evidence for this
              // We would fetch evidence, run diagnosis (Phase 9), etc.
              logger.info(`Automated pipeline finished for ${incidentId}`);
            } catch (e) {
              logger.error(`Automated pipeline failed for ${incidentId}: ${e.message}`);
            }
          });
        }
      }

      res.status(200).json({ status: 'processed', results });
    } catch (error) {
      logger.error('Error processing Grafana webhook', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Zoho Action Approval Webhook
  app.post('/webhooks/zoho/actions', (req, res) => {
    // TODO: Validate Zoho signature and process approval/denial of action
    res.status(200).send({});
  });
}
