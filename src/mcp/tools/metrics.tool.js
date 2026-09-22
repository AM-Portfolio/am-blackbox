import { z } from 'zod';
import { queryMetrics } from '../../integrations/grafana/grafana.metrics.js';

export function registerMetricsTools(mcp) {
  mcp.tool('query_grafana_metrics',
    {
      query: z.string().describe('PromQL query string')
    },
    async ({ query }) => {
      try {
        const result = await queryMetrics(query);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
