/**
 * Evaluates whether a proposed recovery action is allowed in the current environment
 * and whether it requires manual approval before execution.
 */
export function evaluateActionPolicy(environment, actionType) {
  // Simple hardcoded policies for now
  // In a robust system, this could be driven by a database table or OPA rules

  if (environment === 'production') {
    // Production always requires approval for destructive/mutating actions
    return {
      allowed: true,
      requiresApproval: true,
      reason: 'Production environment requires explicit approval for all recovery actions.'
    };
  } else if (environment === 'staging' || environment === 'pre-prod') {
    // Staging allows basic Kubernetes restarts without approval, but not Oracle Cloud restarts
    if (actionType === 'restartPod' || actionType === 'restartDeployment') {
      return {
        allowed: true,
        requiresApproval: false,
        reason: 'Pre-production environments allow automated Kubernetes restarts.'
      };
    } else {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'Infrastructure-level actions require approval even in pre-prod.'
      };
    }
  }

  // Fallback safe mode
  return {
    allowed: false,
    requiresApproval: true,
    reason: 'Unknown environment, defaulting to deny.'
  };
}
