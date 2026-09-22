import { findSimilarPatterns } from './pattern.service.js';

/**
 * Find historical incidents/patterns similar to a current incident.
 */
export async function matchIncidentToPatterns(incident) {
  const keys = [];
  if (incident.affected_service) keys.push(incident.affected_service);
  if (incident.type) keys.push(incident.type);

  if (keys.length === 0) return [];

  return findSimilarPatterns(keys);
}
