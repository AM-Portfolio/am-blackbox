import { analyzeIncidentEvidence } from './diagnosis.engine.js';
import { query } from '../database/client.js';
import { logger } from '../utils/logger.js';

/**
 * Persist diagnosis fields and return the diagnosis object.
 */
export async function runDiagnosisForIncident(incident, evidenceList, extras = {}) {
  logger.info(`Running diagnosis for incident ${incident.id}`);

  const diagnosis = analyzeIncidentEvidence(incident, evidenceList, extras);

  logger.info(`Diagnosis completed for incident ${incident.id}`, {
    confidence: diagnosis.confidence,
    causeCode: diagnosis.causeCode
  });

  await query(
    `UPDATE incidents
     SET suspected_cause = COALESCE($2, suspected_cause),
         confirmed_cause = CASE WHEN $3 = 'high' THEN $2 ELSE confirmed_cause END,
         diagnosis_confidence = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [incident.id, diagnosis.suspectedCause, diagnosis.confidence]
  );

  return diagnosis;
}
