/**
 * Represent/check host-level health signals available to the control plane.
 * This will later integrate with the watchdog/heartbeat service to report
 * which VPS hosts are reporting as healthy.
 */
export function getVpsHealthSummary() {
  // TODO: Aggregate from heartbeat data
  return {
    status: 'unknown',
    activeHosts: 0,
    degradedHosts: 0,
    offlineHosts: 0
  };
}
