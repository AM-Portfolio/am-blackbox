import { z } from 'zod';
import { runDiagnosisForIncident } from '../../diagnosis/diagnosis.service.js';
import { getIncident } from '../../incidents/incident.service.js';
import { getEvidenceForIncident } from '../../evidence/evidence.service.js';

export function registerDiagnosisTools(mcp) {
  mcp.tool('diagnose_incident',
    {
      incidentId: z.string().describe('The UUID of the incident to diagnose')
    },
    async ({ incidentId }) => {
      try {
        const incident = await getIncident(incidentId);
        const evidence = await getEvidenceForIncident(incidentId);
        const diagnosis = await runDiagnosisForIncident(incident, evidence);
        return {
          content: [{ type: 'text', text: JSON.stringify(diagnosis, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
