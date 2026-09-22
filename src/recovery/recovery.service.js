import { query } from '../database/client.js';
import { logger } from '../utils/logger.js';

export async function recordRecoveryAction(incidentId, actionType, status, resultSummary = null, executionLog = null) {
  const result = await query(`
    INSERT INTO recovery_actions (incident_id, action_type, status, result_summary, execution_log)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [incidentId, actionType, status, resultSummary, JSON.stringify(executionLog)]);

  logger.info(`Recorded recovery action ${actionType} for incident ${incidentId} (Status: ${status})`);
  return result.rows[0];
}

export async function updateRecoveryActionStatus(actionId, status, resultSummary = null, executionLog = null) {
  const result = await query(`
    UPDATE recovery_actions 
    SET status = $1, result_summary = COALESCE($2, result_summary), execution_log = COALESCE($3, execution_log)
    WHERE id = $4
    RETURNING *
  `, [status, resultSummary, JSON.stringify(executionLog), actionId]);

  return result.rows[0];
}
