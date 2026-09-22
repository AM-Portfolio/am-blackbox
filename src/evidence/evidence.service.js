import { query } from '../database/client.js';
import { logger } from '../utils/logger.js';

export async function addEvidence(incidentId, source, queryReference, timeStart, timeEnd, summary = null, metadata = {}) {
  const result = await query(`
    INSERT INTO evidence (incident_id, source, query_reference, time_start, time_end, summary, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    incidentId, source, queryReference, 
    new Date(timeStart).toISOString(), 
    new Date(timeEnd).toISOString(), 
    summary, JSON.stringify(metadata)
  ]);

  logger.debug(`Evidence added to incident ${incidentId} from source ${source}`);
  return result.rows[0];
}

export async function getEvidenceForIncident(incidentId) {
  const result = await query(`
    SELECT * FROM evidence
    WHERE incident_id = $1
    ORDER BY created_at ASC
  `, [incidentId]);
  
  return result.rows;
}
