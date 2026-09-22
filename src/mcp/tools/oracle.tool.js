import { getAccountStatus } from '../../integrations/oracle/account.service.js';
import { getAmpereA1Capacity } from '../../integrations/oracle/compute.service.js';

export function registerOracleTools(mcp) {
  mcp.tool(
    'oracle_account_status',
    {},
    async () => {
      try {
        const status = await getAccountStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );

  mcp.tool(
    'oracle_compute_capacity',
    {},
    async () => {
      try {
        const capacity = await getAmpereA1Capacity();
        return {
          content: [{ type: 'text', text: JSON.stringify(capacity, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
