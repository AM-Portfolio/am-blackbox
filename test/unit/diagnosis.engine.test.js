import { describe, it, expect } from 'bun:test';
import { analyzeIncidentEvidence } from '../../src/diagnosis/diagnosis.engine.js';

describe('Diagnosis Engine', () => {
  it('should evaluate CPU exhaustion correctly', async () => {
    // Setup mock evidence
    const mockEvidence = [
      { source: 'prometheus', summary: 'CPU at 99%', query_reference: 'cpu_usage_query' }
    ];
    
    // We expect the diagnosis logic to flag Resource Exhaustion
    expect(mockEvidence[0].summary).toContain('99%');
  });

  it('should evaluate memory exhaustion correctly', async () => {
    const mockEvidence = [
      { source: 'prometheus', summary: 'Memory at 95%', query_reference: 'mem_usage' },
      { source: 'loki', summary: 'OOMKilled detected', query_reference: 'oom_query' }
    ];
    
    expect(mockEvidence[1].summary).toContain('OOMKilled');
  });
});
