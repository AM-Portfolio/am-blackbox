import { createOrUpdatePattern } from './pattern.service.js';

/**
 * Identify repeated incident signatures.
 * Takes an incident and its collected evidence and extracts a signature.
 */
export async function detectPatternFromIncident(incident, evidenceList) {
  // Simplify the incident into a deterministic signature
  const signature = {
    service: incident.affected_service,
    type: incident.type
  };

  // Extract key indicators from evidence
  const hasOom = evidenceList.some(e => e.summary && e.summary.includes('OOMKilled'));
  const hasCrashLoop = evidenceList.some(e => e.summary && e.summary.includes('CrashLoopBackOff'));
  const hasHighMemory = evidenceList.some(e => e.source === 'prometheus' && e.query_reference.includes('MemAvailable') && e.summary && e.summary.includes('High'));

  if (hasOom) signature.indicator = 'oom_killed';
  else if (hasCrashLoop) signature.indicator = 'crash_loop';
  else if (hasHighMemory) signature.indicator = 'high_memory';

  if (!signature.service && !signature.indicator) {
    return null; // Not enough data to form a strong pattern
  }

  const patternName = `${signature.service || 'unknown-service'}_${signature.indicator || signature.type}`;
  
  return createOrUpdatePattern(
    patternName,
    signature,
    incident.affected_service || incident.node,
    `Pattern detected from incident ${incident.id}`
  );
}
