/**
 * Deterministic VPS / OOM diagnosis from evidence + collector summaries.
 */
export function analyzeIncidentEvidence(incident, evidenceList, extras = {}) {
  const {
    oomOffenders = [],
    vpsState = null,
    hostMemory = null,
    reachability = null
  } = extras;

  const diagnosis = {
    classification: 'unknown',
    causeCode: null,
    suspectedCauses: [],
    supportingEvidence: [],
    contradictoryEvidence: [],
    confidence: 'low',
    affectedComponents: [],
    recommendedInvestigation: [],
    recommendedAction: null,
    isConfirmed: false,
    oomOffenders: oomOffenders.slice(0, 20),
    vpsState: vpsState
      ? {
          reachable: vpsState.reachable,
          anyMemoryPressure: vpsState.anyMemoryPressure,
          anyDiskPressure: vpsState.anyDiskPressure,
          anyNotReady: vpsState.anyNotReady,
          nodes: (vpsState.nodes || []).map((n) => ({
            name: n.name,
            isReady: n.isReady,
            memoryPressure: n.memoryPressure,
            diskPressure: n.diskPressure
          }))
        }
      : null
  };

  if (incident.affected_service) {
    diagnosis.affectedComponents.push(incident.affected_service);
  }

  const hasOomEvidence = evidenceList.some(
    (e) =>
      (e.summary && /OOMKilled/i.test(e.summary)) ||
      (e.source === 'kubernetes' && e.metadata && JSON.stringify(e.metadata).includes('OOMKilled'))
  );
  const hasCrashLoop = evidenceList.some((e) => e.summary && e.summary.includes('CrashLoopBackOff'));
  const oomCount = oomOffenders.length;

  // Unreachable = metrics silence only. Missing kube from Blackbox must not override Alloy up.
  const silent =
    reachability?.silent === true ||
    (reachability?.kubeOrMetricsUnreachable === true && reachability?.anyUp !== true);
  const memPressure =
    vpsState?.anyMemoryPressure === true ||
    hostMemory?.pressure === true ||
    evidenceList.some((e) => e.summary && /memory pressure|MemAvailable/i.test(e.summary));
  const notReady = vpsState?.anyNotReady === true;

  if (silent) {
    diagnosis.classification = 'vps_unreachable';
    diagnosis.causeCode = 'vps_unreachable';
    diagnosis.suspectedCauses.push('VPS unreachable or Alloy/metrics silent — host may be dead or network-partitioned');
    diagnosis.supportingEvidence.push('No recent node up series or kube API unreachable');
    diagnosis.confidence = 'high';
    diagnosis.recommendedInvestigation.push('SSH/console to Contabo or Kind host; check kubelet and Alloy');
    diagnosis.recommendedAction = null;
  } else if (oomCount >= 2 || (oomCount >= 1 && memPressure)) {
    diagnosis.classification = 'resource_exhaustion';
    diagnosis.causeCode = 'oom_cascade';
    const names = oomOffenders.map((o) => `${o.namespace}/${o.pod}`).slice(0, 5).join(', ');
    diagnosis.suspectedCauses.push(
      `OOM cascade: ${oomCount} pod(s) OOMKilled${names ? ` (${names})` : ''} contributing to host pressure`
    );
    diagnosis.supportingEvidence.push('Multiple or combined OOMKilled + node/host memory pressure');
    diagnosis.confidence = 'high';
    diagnosis.recommendedAction = 'restartPod';
    diagnosis.recommendedInvestigation.push('Identify top memory consumers; raise limits or scale down noisy pods');
  } else if (hasOomEvidence || oomCount === 1) {
    diagnosis.classification = 'resource_exhaustion';
    diagnosis.causeCode = 'oom_killed';
    const one = oomOffenders[0];
    diagnosis.suspectedCauses.push(
      one
        ? `Pod ${one.namespace}/${one.pod} container ${one.container} OOMKilled`
        : `${incident.affected_service || 'pod'} memory exhaustion (OOMKilled)`
    );
    diagnosis.supportingEvidence.push('Kubernetes/Loki show OOMKilled');
    diagnosis.confidence = 'high';
    diagnosis.recommendedAction = 'restartPod';
  } else if (memPressure || notReady) {
    diagnosis.classification = 'host_pressure';
    diagnosis.causeCode = 'host_memory_exhaustion';
    diagnosis.suspectedCauses.push(
      notReady && memPressure
        ? 'Node NotReady with MemoryPressure — VPS out of state'
        : memPressure
          ? 'Host/node memory exhaustion (MemoryPressure or low MemAvailable)'
          : 'Node NotReady — VPS out of state'
    );
    diagnosis.supportingEvidence.push('Node conditions and/or Prometheus host memory');
    diagnosis.confidence = 'high';
    diagnosis.recommendedInvestigation.push('Check which workloads grew; free disk/mem; restart kubelet if stuck');
  } else if (hasCrashLoop) {
    diagnosis.classification = 'application_failure';
    diagnosis.causeCode = 'crash_loop';
    diagnosis.suspectedCauses.push(`${incident.affected_service || 'pod'} CrashLoopBackOff`);
    diagnosis.supportingEvidence.push('Kubernetes events show CrashLoopBackOff');
    diagnosis.confidence = 'medium';
    diagnosis.recommendedAction = 'restartDeployment';
  }

  diagnosis.suspectedCause = diagnosis.suspectedCauses[0] || null;
  return diagnosis;
}
