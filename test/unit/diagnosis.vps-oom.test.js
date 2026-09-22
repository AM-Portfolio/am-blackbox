import { describe, expect, test } from 'bun:test';
import { analyzeIncidentEvidence } from '../src/diagnosis/diagnosis.engine.js';

describe('VPS/OOM diagnosis', () => {
  const incident = { id: '1', affected_service: 'demo-api', environment: 'production' };

  test('oom_cascade when multiple OOM + pressure', () => {
    const d = analyzeIncidentEvidence(incident, [], {
      oomOffenders: [
        { namespace: 'a', pod: 'p1', container: 'c' },
        { namespace: 'a', pod: 'p2', container: 'c' }
      ],
      vpsState: { reachable: true, anyMemoryPressure: true, anyDiskPressure: false, anyNotReady: false, nodes: [] }
    });
    expect(d.causeCode).toBe('oom_cascade');
    expect(d.confidence).toBe('high');
  });

  test('vps_unreachable when silent', () => {
    const d = analyzeIncidentEvidence(incident, [], {
      reachability: { silent: true },
      vpsState: { reachable: false, error: 'timeout', nodes: [] }
    });
    expect(d.causeCode).toBe('vps_unreachable');
  });

  test('not vps_unreachable when kube down but Grafana host up', () => {
    const d = analyzeIncidentEvidence(incident, [], {
      reachability: { silent: false, anyUp: true },
      vpsState: { reachable: false, error: 'connect ECONNREFUSED 127.0.0.1:8080', nodes: [] }
    });
    expect(d.causeCode).not.toBe('vps_unreachable');
  });

  test('host_memory_exhaustion on MemoryPressure', () => {
    const d = analyzeIncidentEvidence(incident, [], {
      oomOffenders: [],
      vpsState: {
        reachable: true,
        anyMemoryPressure: true,
        anyDiskPressure: false,
        anyNotReady: true,
        nodes: [{ name: 'n1', isReady: false, memoryPressure: true }]
      }
    });
    expect(d.causeCode).toBe('host_memory_exhaustion');
  });
});
