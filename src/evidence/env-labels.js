/**
 * Map incident.environment to Alloy/Grafana label values.
 * local → null (skip cloud filters / use stubs).
 */
export function grafanaEnvironmentLabel(environment) {
  const e = String(environment || '').toLowerCase();
  if (!e || e === 'local' || e === 'unknown') return null;
  if (e === 'prod' || e === 'production') return 'production';
  if (e === 'nonprod' || e === 'non-prod' || e === 'preprod' || e === 'pre-prod' || e === 'staging') {
    return 'nonprod';
  }
  return e;
}

export function withEnvLabel(baseSelector, environment) {
  const env = grafanaEnvironmentLabel(environment);
  if (!env) return baseSelector;
  const trimmed = baseSelector.replace(/^\s*\{|\}\s*$/g, '');
  if (!trimmed) return `{environment="${env}"}`;
  return `{${trimmed},environment="${env}"}`;
}
