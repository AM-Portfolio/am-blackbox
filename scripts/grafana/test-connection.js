#!/usr/bin/env node
/**
 * Standalone Grafana Cloud connectivity test.
 * Loads am-blackbox/.env — never prints the token.
 * Usage: node scripts/grafana/test-connection.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(file) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function basicAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
}

function mask(s) {
  if (!s) return '(empty)';
  return `${s.slice(0, 6)}…(${s.length} chars)`;
}

async function check(name, fn) {
  try {
    const detail = await fn();
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
    return true;
  } catch (e) {
    console.log(`FAIL  ${name} — ${e.message}`);
    return false;
  }
}

async function main() {
  const envPath = resolve(process.cwd(), '.env');
  const env = loadEnv(envPath);
  const token = env.GRAFANA_API_TOKEN;
  if (!token || token.includes('placeholder')) {
    console.log('FAIL  GRAFANA_API_TOKEN missing in .env');
    process.exit(1);
  }
  console.log(`Token present: ${mask(token)}`);
  console.log(`GRAFANA_DISABLED=${env.GRAFANA_DISABLED}`);

  const results = [];

  // Prometheus query API (same host as push, /api/v1/query)
  const promBase = (env.GRAFANA_PROMETHEUS_URL || '').replace(/\/api\/prom\/push\/?$/, '');
  results.push(
    await check('Prometheus query up', async () => {
      const url = `${promBase}/api/prom/api/v1/query?query=${encodeURIComponent('vector(1)')}`;
      const res = await fetch(url, {
        headers: { Authorization: basicAuth(env.GRAFANA_PROMETHEUS_USERNAME, token) }
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
      const j = JSON.parse(text);
      if (j.status !== 'success') throw new Error(`status=${j.status}`);
      return `HTTP ${res.status}`;
    })
  );

  // Loki labels
  const lokiBase = (env.GRAFANA_LOKI_URL || '').replace(/\/loki\/api\/v1\/push\/?$/, '');
  results.push(
    await check('Loki labels', async () => {
      const url = `${lokiBase}/loki/api/v1/labels`;
      const res = await fetch(url, {
        headers: { Authorization: basicAuth(env.GRAFANA_LOKI_USERNAME, token) }
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
      return `HTTP ${res.status}`;
    })
  );

  // Grafana HTTP API (Bearer) — try configured URL then common fallbacks
  const candidates = [
    env.GRAFANA_URL,
    'https://asrax.grafana.net',
    'https://grafana.com'
  ].filter(Boolean);

  let grafanaOk = false;
  let workingUrl = null;
  let datasources = [];
  for (const base of candidates) {
    const ok = await check(`Grafana API ${base}/api/datasources`, async () => {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/datasources`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
      datasources = JSON.parse(text);
      workingUrl = base;
      grafanaOk = true;
      return `${Array.isArray(datasources) ? datasources.length : 0} datasources`;
    });
    results.push(ok);
    if (ok) break;
  }

  if (grafanaOk && Array.isArray(datasources)) {
    const prom = datasources.find((d) => /prometheus/i.test(d.type) || /prometheus/i.test(d.name || ''));
    const loki = datasources.find((d) => /loki/i.test(d.type) || /loki/i.test(d.name || ''));
    console.log(
      `INFO  datasources: prom uid=${prom?.uid || 'n/a'} loki uid=${loki?.uid || 'n/a'} stack=${workingUrl}`
    );
  }

  const passed = results.every(Boolean) || (results[0] && results[1]);
  // Require at least Prom + Loki; Grafana UI API is bonus
  const coreOk = results[0] && results[1];
  console.log(coreOk ? '\nRESULT: Grafana Cloud connection OK (Prom+Loki)' : '\nRESULT: Grafana Cloud connection FAILED');
  if (grafanaOk) console.log(`RESULT: Grafana HTTP API OK at ${workingUrl}`);
  else console.log('RESULT: Grafana HTTP API not verified (Prom/Loki may still work for push)');

  process.exit(coreOk ? 0 : 1);
}

main().catch((e) => {
  console.error('FAIL  unexpected', e.message);
  process.exit(1);
});
