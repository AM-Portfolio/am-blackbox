/**
 * Represent/check host-level health signals available to the control plane.
 */
import { getClusterVpsState, queryVpsReachability, queryHostMemoryPressure } from '../evidence/vps-oom.service.js';
import { logger } from '../utils/logger.js';

export async function getVpsHealthSummary(environment = 'production') {
  let vpsState = { reachable: false, nodes: [] };
  let reachability = { silent: true };
  let hostMemory = {};

  try {
    vpsState = await getClusterVpsState();
  } catch (e) {
    logger.warn('VPS kube state unavailable', { error: e.message });
  }

  try {
    reachability = await queryVpsReachability(environment);
    hostMemory = await queryHostMemoryPressure(environment);
  } catch (e) {
    logger.warn('VPS metrics unavailable', { error: e.message });
  }

  // Host liveness = Alloy/Grafana node scrape only. Local kube probe failure must not
  // mark the VPS offline (Docker Blackbox often cannot reach Kind/Contabo API).
  const metricsAlive = reachability.silent === false && reachability.anyUp === true;
  const offline = reachability.silent === true;
  const degraded =
    vpsState.anyMemoryPressure ||
    vpsState.anyDiskPressure ||
    vpsState.anyNotReady ||
    hostMemory.pressure === true;

  let status;
  if (offline) status = 'offline';
  else if (degraded) status = 'degraded';
  else if (metricsAlive || vpsState.reachable) status = 'healthy';
  else status = 'unknown';

  // #region agent log
  fetch('http://127.0.0.1:7619/ingest/c2287e01-93ba-4ea0-ab36-19887309c71e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'244321'},body:JSON.stringify({sessionId:'244321',runId:'post-fix',hypothesisId:'A',location:'vps.health.js:getVpsHealthSummary',message:'vps health status decision',data:{environment,status,offline,metricsAlive,silent:reachability.silent===true,anyUp:reachability.anyUp===true,kubeReachable:vpsState.reachable===true,kubeError:vpsState.error||null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return {
    status,
    environment,
    activeHosts: (vpsState.nodes || []).filter((n) => n.isReady).length,
    degradedHosts: (vpsState.nodes || []).filter((n) => n.memoryPressure || n.diskPressure || !n.isReady).length,
    offlineHosts: offline ? 1 : 0,
    vpsState,
    reachability,
    hostMemory,
    notes:
      !vpsState.reachable && metricsAlive
        ? 'Host metrics healthy; kube API unavailable from this Blackbox process'
        : undefined
  };
}
