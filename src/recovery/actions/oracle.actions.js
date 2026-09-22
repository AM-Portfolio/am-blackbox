import { getOciClient, safeOciCall } from '../../integrations/oracle/oci.client.js';
import { logger } from '../../utils/logger.js';

/**
 * Soft-reset an OCI compute instance (INSTANCE_ACTION RESET).
 */
export async function restartInstance(instanceId) {
  if (!instanceId) {
    throw new Error('instanceId is required');
  }

  logger.info(`Oracle Action: Restarting instance ${instanceId}`);
  const client = getOciClient();
  const result = await safeOciCall('instanceAction RESET', () =>
    client.request({
      service: 'iaas',
      method: 'POST',
      path: `/20160918/instances/${encodeURIComponent(instanceId)}`,
      query: { action: 'RESET' }
    })
  );

  if (!result.ok) {
    return { success: false, message: result.error, status: result.status };
  }

  return {
    success: true,
    message: `Oracle instance ${instanceId} RESET accepted`,
    lifecycleState: result.data?.lifecycleState
  };
}
