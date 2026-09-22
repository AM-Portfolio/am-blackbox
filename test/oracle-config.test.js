import { describe, expect, test } from 'bun:test';
import { loadOracleConfig, assertOracleConfig } from '../src/config/oracle.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('oracle config', () => {
  test('loads INI defaults from secrets/oci.config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bb-oci-'));
    try {
      mkdirSync(join(dir, 'secrets'));
      writeFileSync(
        join(dir, 'secrets', 'oci.config'),
        `[DEFAULT]
user=ocid1.user.oc1..testuser
fingerprint=aa:bb:cc
tenancy=ocid1.tenancy.oc1..testtenancy
region=ap-mumbai-1
key_file=secrets/oci_api_key.pem
`
      );
      writeFileSync(join(dir, 'secrets', 'oci_api_key.pem'), '-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----\n');

      const prev = { ...process.env };
      delete process.env.ORACLE_CLOUD_REGION;
      delete process.env.ORACLE_CLOUD_TENANCY;
      delete process.env.ORACLE_CLOUD_USER;
      delete process.env.ORACLE_CLOUD_FINGERPRINT;
      delete process.env.ORACLE_CLOUD_KEY_FILE;

      const cfg = loadOracleConfig(dir);
      expect(cfg.region).toBe('ap-mumbai-1');
      expect(cfg.tenancy).toBe('ocid1.tenancy.oc1..testtenancy');
      expect(cfg.user).toBe('ocid1.user.oc1..testuser');
      assertOracleConfig(cfg);

      process.env = prev;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
