import { z } from 'zod';
import { proposeAction } from '../../recovery/recovery.engine.js';
import { getIncident } from '../../incidents/incident.service.js';

export function registerRecoveryTools(mcp) {
  mcp.tool('propose_recovery_action',
    {
      incidentId: z.string().describe('The UUID of the incident'),
      actionType: z.string().describe('The type of action (e.g. restartPod, restartDeployment, restartInstance)'),
      parameters: z.record(z.any()).describe('Parameters for the action (e.g. { "podName": "my-pod" })')
    },
    async ({ incidentId, actionType, parameters }) => {
      try {
        const incident = await getIncident(incidentId);
        const result = await proposeAction(incident, actionType, parameters);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
