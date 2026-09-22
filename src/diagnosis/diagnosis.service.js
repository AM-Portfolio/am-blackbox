import { analyzeIncidentEvidence } from './diagnosis.engine.js';
import { updateIncidentStatus } from '../incidents/incident.service.js';
import { logger } from '../utils/logger.js';

/**
 * Orchestrates diagnosis for an incident.
 */
export async function runDiagnosisForIncident(incident, evidenceList) {
  logger.info(`Running diagnosis for incident ${incident.id}`);
  
  const diagnosis = analyzeIncidentEvidence(incident, evidenceList);
  
  logger.info(`Diagnosis completed for incident ${incident.id}`, { confidence: diagnosis.confidence });

  // Save the diagnosis back to the incident
  await updateIncidentStatus(incident.id, incident.status, {
    confirmed_cause: diagnosis.suspectedCause // Assuming we want to store it here for now
  });

  return diagnosis;
}
