import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load OCI config from env and optional secrets/oci.config (INI).
 * Env vars win over file values when set.
 */
export function loadOracleConfig(cwd = process.cwd()) {
  const configPath = resolve(
    cwd,
    process.env.ORACLE_CLOUD_CONFIG_FILE || 'secrets/oci.config'
  );

  let file = {};
  if (existsSync(configPath)) {
    file = parseOciIni(readFileSync(configPath, 'utf8'));
  }

  const region = process.env.ORACLE_CLOUD_REGION || file.region;
  const tenancy = process.env.ORACLE_CLOUD_TENANCY || file.tenancy;
  const user = process.env.ORACLE_CLOUD_USER || file.user;
  const fingerprint = process.env.ORACLE_CLOUD_FINGERPRINT || file.fingerprint;
  let keyFile = process.env.ORACLE_CLOUD_KEY_FILE || file.key_file;

  if (keyFile && !keyFile.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(keyFile)) {
    keyFile = resolve(cwd, keyFile);
  }

  return {
    region,
    tenancy,
    user,
    fingerprint,
    keyFile,
    configPath: existsSync(configPath) ? configPath : null
  };
}

export function assertOracleConfig(config) {
  const missing = [];
  for (const key of ['region', 'tenancy', 'user', 'fingerprint', 'keyFile']) {
    if (!config[key] || String(config[key]).includes('placeholder') || String(config[key]).includes('YOUR_')) {
      missing.push(key);
    }
  }
  if (missing.length) {
    throw new Error(
      `Oracle Cloud config incomplete (missing/placeholder: ${missing.join(', ')}). ` +
        'See secrets/README.md — create an API key and secrets/oci.config.'
    );
  }
  if (!existsSync(config.keyFile)) {
    throw new Error(`Oracle Cloud private key not found: ${config.keyFile}`);
  }
}

function parseOciIni(text) {
  const out = {};
  let inDefault = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    if (line.startsWith('[')) {
      inDefault = line.toLowerCase() === '[default]';
      continue;
    }
    if (!inDefault) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    out[k] = v;
  }
  return out;
}

/** @deprecated Prefer loadOracleConfig(); kept for existing imports. */
export const oracleConfig = {
  get region() {
    return loadOracleConfig().region;
  },
  get tenancy() {
    return loadOracleConfig().tenancy;
  },
  get user() {
    return loadOracleConfig().user;
  },
  get fingerprint() {
    return loadOracleConfig().fingerprint;
  },
  get keyFile() {
    return loadOracleConfig().keyFile;
  }
};
