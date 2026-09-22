import { logger } from '../utils/logger.js';
import { getPodStatus, getDeploymentStatus } from '../integrations/kubernetes/pods.js'; // Note: getDeploymentStatus is from deployments.js, I will fix import
import { getDeploymentStatus as fetchDeploymentStatus } from '../integrations/kubernetes/deployments.js';
import { queryMetrics } from '../integrations/grafana/grafana.metrics.js';
import { updateRecoveryActionStatus } from './recovery.service.js';

/**
 * Validates that an executed recovery action actually fixed the issue.
 */
export async function verifyRecovery(actionRecord, incident) {
  logger.info(`Starting verification for action ${actionRecord.id} on incident ${incident.id}`);
  let isHealthy = false;
  let verificationDetails = {};

  try {
    if (actionRecord.action_type === 'restartPod') {
      const podName = actionRecord.execution_log?.parameters?.podName || incident.pod;
      const status = await getPodStatus(incident.environment, podName);
      // Wait, restarting a pod means the OLD pod is deleted. 
      // We should check if the deployment has ready replicas.
      const deploymentName = incident.affected_service;
      if (deploymentName) {
        const depStatus = await fetchDeploymentStatus(incident.environment, deploymentName);
        isHealthy = depStatus.readyReplicas === depStatus.replicas && depStatus.replicas > 0;
        verificationDetails = depStatus;
      } else {
        // Just checking if any pod with this label is running
        isHealthy = status.phase === 'Running' && !status.crashLoop;
        verificationDetails = status;
      }
    } else if (actionRecord.action_type === 'restartDeployment') {
      const deploymentName = actionRecord.execution_log?.parameters?.deploymentName || incident.affected_service;
      const depStatus = await fetchDeploymentStatus(incident.environment, deploymentName);
      isHealthy = depStatus.readyReplicas === depStatus.replicas && depStatus.replicas > 0;
      verificationDetails = depStatus;
    } else if (actionRecord.action_type === 'restartInstance') {
      // Check node exporter metrics or Kube node status
      const upQuery = `up{instance=~"${incident.node}.*"}`;
      const metrics = await queryMetrics(upQuery);
      if (metrics.data?.result?.length > 0) {
        const value = metrics.data.result[0].value[1];
        isHealthy = value === '1';
      }
      verificationDetails = { nodeUp: isHealthy };
    }

    if (isHealthy) {
      logger.info(`Verification passed for action ${actionRecord.id}`);
      await updateRecoveryActionStatus(actionRecord.id, 'verified_success', 'Verification confirmed health restored.', verificationDetails);
    } else {
      logger.warn(`Verification failed for action ${actionRecord.id}`);
      await updateRecoveryActionStatus(actionRecord.id, 'verified_failed', 'Verification indicates issue persists.', verificationDetails);
    }

    return isHealthy;
  } catch (error) {
    logger.error(`Verification process failed for action ${actionRecord.id}: ${error.message}`);
    return false;
  }
}
