import { query, withTransaction } from '../database/client.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export async function createIncident(data) {
  const { environment, severity, type, title, affected_service, pod, node, suspected_cause } = data;
  
  const result = await query(`
    INSERT INTO incidents (environment, severity, type, title, status, affected_service, pod, node, suspected_cause)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    environment, severity, type, title, 'open', affected_service, pod, node, suspected_cause
  ]);

  const incident = result.rows[0];
  logger.info(`Incident created: ${incident.id}`, { title: incident.title });
  return incident;
}

export async function getIncident(id) {
  const result = await query('SELECT * FROM incidents WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
}

export async function updateIncidentStatus(id, status, resolutionDetails = null) {
  let queryText = 'UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP';
  const params = [status, id];
  
  if (status === 'resolved') {
    queryText += ', resolved_at = CURRENT_TIMESTAMP, confirmed_cause = $3';
    params.push(resolutionDetails?.confirmed_cause || null);
  }
  
  queryText += ' WHERE id = $2 RETURNING *';

  const result = await query(queryText, params);
  if (result.rows.length === 0) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }
  
  logger.info(`Incident ${id} status updated to ${status}`);
  return result.rows[0];
}

export async function addIncidentEvent(incidentId, eventType, message, metadata = {}) {
  await query(`
    INSERT INTO incident_events (incident_id, event_type, message, metadata)
    VALUES ($1, $2, $3, $4)
  `, [incidentId, eventType, message, JSON.stringify(metadata)]);
}
