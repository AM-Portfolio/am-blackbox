/**
 * Smoke-check evidence path after Grafana enable (no token printing).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i).trim()]) {
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const { queryMetrics } = await import('../../src/integrations/grafana/grafana.metrics.js');
const { queryLogsRange } = await import('../../src/integrations/grafana/grafana.logs.js');

const results = {
  grafanaDisabled: process.env.GRAFANA_DISABLED,
  tokenPresent: Boolean(process.env.GRAFANA_API_TOKEN),
  metrics: 'fail',
  logs: 'fail'
};

try {
  const m = await queryMetrics('vector(1)');
  results.metrics = m?.status === 'success' ? 'pass' : 'fail';
} catch (e) {
  results.metrics = `fail:${e.message}`;
}

try {
  const endNs = BigInt(Date.now()) * 1000000n;
  const startNs = endNs - 60n * 1000000000n;
  const l = await queryLogsRange('{job=~".+"}', startNs.toString(), endNs.toString(), 5);
  results.logs = l ? 'pass' : 'fail';
} catch (e) {
  results.logs = `fail:${e.message}`;
}

const ok = results.metrics === 'pass' && results.logs === 'pass' && results.grafanaDisabled === 'false';
console.log(JSON.stringify({ ...results, overall: ok ? 'PASS' : 'FAIL' }, null, 2));
process.exit(ok ? 0 : 1);
