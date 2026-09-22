/**
 * Perform deterministic evidence-based diagnosis.
 */
export function analyzeIncidentEvidence(incident, evidenceList) {
  const diagnosis = {
    classification: 'unknown',
    suspectedCauses: [],
    supportingEvidence: [],
    contradictoryEvidence: [],
    confidence: 'low',
    affectedComponents: [],
    recommendedInvestigation: [],
    recommendedAction: null,
    isConfirmed: false
  };

  if (incident.affected_service) {
    diagnosis.affectedComponents.push(incident.affected_service);
  }

  const hasOom = evidenceList.find(e => e.summary && e.summary.includes('OOMKilled'));
  const hasCrashLoop = evidenceList.find(e => e.summary && e.summary.includes('CrashLoopBackOff'));
  const memEvidence = evidenceList.find(e => e.source === 'prometheus' && e.query_reference.includes('MemAvailable'));

  if (hasOom) {
    diagnosis.classification = 'resource_exhaustion';
    diagnosis.suspectedCauses.push(`${incident.affected_service || 'pod'} memory exhaustion`);
    diagnosis.supportingEvidence.push('Kubernetes events show OOMKilled');
    diagnosis.confidence = 'high';
    diagnosis.recommendedAction = 'restartPod'; // Typed action
  } else if (hasCrashLoop) {
    diagnosis.classification = 'application_failure';
    diagnosis.suspectedCauses.push(`${incident.affected_service || 'pod'} application crash loop`);
    diagnosis.supportingEvidence.push('Kubernetes events show CrashLoopBackOff');
    diagnosis.confidence = 'medium';
    diagnosis.recommendedInvestigation.push('Check application logs for startup errors');
    diagnosis.recommendedAction = 'restartDeployment';
  }

  if (memEvidence && memEvidence.summary && memEvidence.summary.includes('High')) {
    diagnosis.supportingEvidence.push('Node memory pressure is high');
  }

  return diagnosis;
}
