import { query } from '../database/client.js';

/**
 * Attempts to correlate a new alert to an existing open incident.
 * Returns the incident ID if correlated, null otherwise.
 */
export async function correlateAlert(alert) {
  // Simple time-aware correlation logic based on service/node
  // In a real scenario, this would involve comparing time windows and topology

  if (!alert.service && !alert.node) {
    return null; 
  }

  const { rows } = await query(`
    SELECT id FROM incidents 
    WHERE status = 'open' 
      AND environment = $1
      AND (
        (affected_service = $2 AND affected_service IS NOT NULL) OR
        (node = $3 AND node IS NOT NULL)
      )
    ORDER BY created_at DESC
    LIMIT 1
  `, [alert.environment || 'unknown', alert.service, alert.node]);

  if (rows.length > 0) {
    return rows[0].id;
  }

  return null;
}
