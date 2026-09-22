import { evaluateActionPolicy } from '../policies/policy.engine.js';
import { recordRecoveryAction, updateRecoveryActionStatus } from './recovery.service.js';
import { notifyActionRequiresApproval } from '../notifications/notifier.js';
import { restartPod, restartDeployment } from './actions/kubernetes.actions.js';
import { restartInstance } from './actions/oracle.actions.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export async function proposeAction(incident, actionType, parameters) {
  const policy = evaluateActionPolicy(incident.environment, actionType);

  if (!policy.allowed) {
    logger.warn(`Action ${actionType} denied for incident ${incident.id}: ${policy.reason}`);
    await recordRecoveryAction(incident.id, actionType, 'denied', policy.reason);
    return { status: 'denied', reason: policy.reason };
  }

  const actionRecord = await recordRecoveryAction(
    incident.id, 
    actionType, 
    policy.requiresApproval ? 'pending_approval' : 'approved', 
    policy.reason,
    { parameters }
  );

  if (policy.requiresApproval) {
    logger.info(`Action ${actionType} for incident ${incident.id} requires approval.`);
    await notifyActionRequiresApproval(incident, actionRecord);
    return { status: 'pending_approval', actionId: actionRecord.id };
  }

  // If approved automatically, execute it immediately
  return executeAction(actionRecord, incident, parameters);
}

export async function executeAction(actionRecord, incident, parameters) {
  logger.info(`Executing action ${actionRecord.action_type} for incident ${incident.id}`);
  
  await updateRecoveryActionStatus(actionRecord.id, 'in_progress');

  try {
    let result;
    switch (actionRecord.action_type) {
      case 'restartPod':
        result = await restartPod(incident.environment, parameters.podName || incident.pod);
        break;
      case 'restartDeployment':
        result = await restartDeployment(incident.environment, parameters.deploymentName || incident.affected_service);
        break;
      case 'restartInstance':
        result = await restartInstance(parameters.instanceId || incident.node);
        break;
      default:
        throw new AppError(`Unknown action type: ${actionRecord.action_type}`, 400);
    }

    await updateRecoveryActionStatus(actionRecord.id, 'completed', result.message, { result });
    return { status: 'completed', result };
  } catch (error) {
    logger.error(`Action ${actionRecord.action_type} failed: ${error.message}`);
    await updateRecoveryActionStatus(actionRecord.id, 'failed', error.message, { error: error.stack });
    return { status: 'failed', error: error.message };
  }
}
