import { z } from 'zod';
import { getIncident } from '../../incidents/incident.service.js';
import { getIncidentTimeline } from '../../incidents/incident.timeline.js';

export function registerIncidentTools(mcp) {
  mcp.tool('get_incident',
    {
      id: z.string().describe('The UUID of the incident')
    },
    async ({ id }) => {
      try {
        const incident = await getIncident(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(incident, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );

  mcp.tool('get_incident_timeline',
    {
      id: z.string().describe('The UUID of the incident')
    },
    async ({ id }) => {
      try {
        const timeline = await getIncidentTimeline(id);
        return {
          content: [{ type: 'text', text: JSON.stringify(timeline, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
