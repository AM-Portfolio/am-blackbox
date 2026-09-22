import { logger } from '../utils/logger.js';
import { addEvidence, getEvidenceForIncident } from './evidence.service.js';
import { addIncidentEvent } from '../incidents/incident.service.js';
import { config } from '../config/index.js';
import { getKubernetesEventEvidence } from './kubernetes-events.service.js';
import { grafanaEnvironmentLabel } from './env-labels.js';
import {
  findOomKilledPods,
  getClusterVpsState,
  queryOomLogs,
  queryHostMemoryPressure,
  queryVpsReachability
} from './vps-oom.service.js';
import { runDiagnosisForIncident } from '../diagnosis/diagnosis.service.js';

/**
 * Attach local/stub evidence when Grafana is disabled (Phase 1 core flow).
 */
export async function attachStubEvidence(incident, alert = {}) {
  const now = Date.now();
  const timeStart = new Date(now - 3600000).toISOString();
  const timeEnd = new Date(now).toISOString();

  await addEvidence(
    incident.id,
    'stub',
    `manual://${incident.affected_service || 'unknown'}/${incident.pod || 'n/a'}`,
    timeStart,
    timeEnd,
    `Stub evidence for ${incident.title}`,
    {
      mode: 'grafana_disabled',
      alertName: alert.name || null,
      service: incident.affected_service,
      pod: incident.pod,
      node: incident.node
    }
  );

  await addEvidence(
    incident.id,
    'manual',
    'core-flow-verify',
    timeStart,
    timeEnd,
    'Phase 1 manual webhook stub — no Grafana query executed',
    { phase: 1 }
  );

  await addIncidentEvent(
    incident.id,
    'evidence_attached',
    'Stub evidence attached (GRAFANA_DISABLED)',
    { sources: ['stub', 'manual'] }
  );

  logger.info(`Stub evidence attached for incident ${incident.id}`);
}

/**
 * Collect OOM / VPS pressure evidence and run diagnosis.
 */
export async function collectVpsOomEvidence(incident) {
  const now = Date.now();
  const timeStart = new Date(now - 3600000).toISOString();
  const timeEnd = new Date(now).toISOString();
  const extras = {
    oomOffenders: [],
    vpsState: null,
    hostMemory: null,
    reachability: null
  };

  try {
    extras.oomOffenders = await findOomKilledPods(null);
  } catch (e) {
    logger.warn('findOomKilledPods failed', { error: e.message });
  }

  try {
    extras.vpsState = await getClusterVpsState(incident.node);
  } catch (e) {
    extras.vpsState = { reachable: false, error: e.message, nodes: [] };
  }

  if (!config.grafana.disabled) {
    extras.hostMemory = await queryHostMemoryPressure(incident.environment, incident.node);
    extras.reachability = await queryVpsReachability(incident.environment);
    const oomLogs = await queryOomLogs(incident.environment, now - 3600000, now);
    if (oomLogs.lines?.length) {
      await addEvidence(
        incident.id,
        'loki',
        oomLogs.query || 'OOMKilled',
        timeStart,
        timeEnd,
        `OOMKilled log lines: ${oomLogs.lines.length}`,
        { lines: oomLogs.lines.slice(0, 20) }
      );
    }
  }

  if (extras.oomOffenders.length) {
    await addEvidence(
      incident.id,
      'kubernetes',
      'pods with OOMKilled',
      timeStart,
      timeEnd,
      `OOMKilled pods: ${extras.oomOffenders.length} — ${extras.oomOffenders
        .slice(0, 5)
        .map((o) => `${o.namespace}/${o.pod}`)
        .join(', ')}`,
      { offenders: extras.oomOffenders }
    );
  }

  if (extras.vpsState) {
    const summary = extras.vpsState.reachable
      ? `VPS/nodes: memoryPressure=${extras.vpsState.anyMemoryPressure} diskPressure=${extras.vpsState.anyDiskPressure} notReady=${extras.vpsState.anyNotReady}`
      : `VPS unreachable: ${extras.vpsState.error || 'kube API failed'}`;
    await addEvidence(
      incident.id,
      'kubernetes',
      'node conditions',
      timeStart,
      timeEnd,
      summary,
      { vpsState: extras.vpsState }
    );
  }

  if (extras.hostMemory && !extras.hostMemory.skipped) {
    await addEvidence(
      incident.id,
      'prometheus',
      extras.hostMemory.query || 'node_memory',
      timeStart,
      timeEnd,
      extras.hostMemory.pressure
        ? `High host memory pressure (avail%=${extras.hostMemory.minAvailablePercent})`
        : `Host memory ok (avail%=${extras.hostMemory.minAvailablePercent})`,
      extras.hostMemory
    );
  }

  if (extras.reachability && !extras.reachability.skipped && extras.reachability.silent) {
    await addEvidence(
      incident.id,
      'prometheus',
      extras.reachability.query || 'up{job="node"}',
      timeStart,
      timeEnd,
      'VPS silent — no recent node up metrics (possible dead host)',
      extras.reachability
    );
  }

  return extras;
}

/**
 * Orchestrates fetching evidence from multiple sources for an incident and saving references.
 */
export async function correlateEvidenceForIncident(incident, alert = {}) {
  logger.info(`Starting evidence collection for incident ${incident.id}`);

  if (config.grafana.disabled) {
    logger.info(`Grafana disabled — using stub evidence for ${incident.id}`);
    await attachStubEvidence(incident, alert);
    // Still try kube-local OOM/VPS if kubeconfig available (optional)
    let extras = { oomOffenders: [], vpsState: null };
    try {
      extras = await collectVpsOomEvidence(incident);
    } catch (e) {
      logger.warn('Local VPS/OOM collect skipped', { error: e.message });
    }
    const evidenceList = await getEvidenceForIncident(incident.id);
    const diagnosis = await runDiagnosisForIncident(incident, evidenceList, extras);
    await addIncidentEvent(incident.id, 'diagnosis_completed', diagnosis.suspectedCause || 'unknown', {
      causeCode: diagnosis.causeCode,
      confidence: diagnosis.confidence,
      oomOffenders: diagnosis.oomOffenders
    });
    return;
  }

  const now = Date.now();
  const timeStart = new Date(now - 3600000).toISOString();
  const timeEnd = new Date(now).toISOString();
  const env = grafanaEnvironmentLabel(incident.environment);

  if (incident.pod && incident.affected_service) {
    try {
      const logsQuery = env
        ? `{environment="${env}",pod=~"${incident.pod}.*"}`
        : `{pod=~"${incident.pod}.*"}`;
      await addEvidence(
        incident.id,
        'loki',
        logsQuery,
        timeStart,
        timeEnd,
        `Logs for pod ${incident.pod}`
      );

      const events = await getKubernetesEventEvidence(
        'default',
        incident.pod,
        'Pod'
      );

      if (events.length > 0) {
        await addEvidence(
          incident.id,
          'kubernetes',
          `Events for pod ${incident.pod}`,
          timeStart,
          timeEnd,
          `${events.length} events found`,
          { events }
        );
      }
    } catch (e) {
      logger.warn(`Failed to collect pod evidence for incident ${incident.id}`, { error: e.message });
    }
  }

  if (incident.node) {
    try {
      const cpuSel = env
        ? `environment="${env}",instance=~"${incident.node}.*"`
        : `instance=~"${incident.node}.*"`;
      const cpuQuery = `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle",${cpuSel}}[5m])) * 100)`;
      await addEvidence(
        incident.id,
        'prometheus',
        cpuQuery,
        timeStart,
        timeEnd,
        `CPU metrics for node ${incident.node}`
      );

      const memQuery = `100 * (1 - (node_memory_MemAvailable_bytes{${cpuSel}} / node_memory_MemTotal_bytes{${cpuSel}}))`;
      await addEvidence(
        incident.id,
        'prometheus',
        memQuery,
        timeStart,
        timeEnd,
        `Memory metrics for node ${incident.node}`
      );
    } catch (e) {
      logger.warn(`Failed to collect node evidence for incident ${incident.id}`, { error: e.message });
    }
  }

  const extras = await collectVpsOomEvidence(incident);
  const evidenceList = await getEvidenceForIncident(incident.id);
  const diagnosis = await runDiagnosisForIncident(incident, evidenceList, extras);

  await addIncidentEvent(incident.id, 'diagnosis_completed', diagnosis.suspectedCause || 'unknown', {
    causeCode: diagnosis.causeCode,
    confidence: diagnosis.confidence,
    oomOffenders: diagnosis.oomOffenders
  });

  logger.info(`Evidence + diagnosis finished for ${incident.id}`, { causeCode: diagnosis.causeCode });
}
