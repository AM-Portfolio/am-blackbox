import { createSign, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadOracleConfig, assertOracleConfig } from '../../config/oracle.js';
import { logger } from '../../utils/logger.js';

/**
 * Lightweight OCI REST client (API key signing).
 * https://docs.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */
export class OciClient {
  /**
   * @param {ReturnType<typeof loadOracleConfig>} [config]
   */
  constructor(config) {
    this.config = config || loadOracleConfig();
    assertOracleConfig(this.config);
    this.privateKeyPem = readFileSync(this.config.keyFile, 'utf8');
    this.region = this.config.region;
    this.tenancy = this.config.tenancy;
    this.user = this.config.user;
    this.fingerprint = this.config.fingerprint;
    this.keyId = `${this.tenancy}/${this.user}/${this.fingerprint}`;
  }

  hostFor(service) {
    const map = {
      identity: `identity.${this.region}.oraclecloud.com`,
      iaas: `iaas.${this.region}.oraclecloud.com`,
      limits: `limits.${this.region}.oraclecloud.com`,
      usageapi: `usageapi.${this.region}.oraclecloud.com`,
      organizations: `organizations.${this.region}.oraclecloud.com`
    };
    const host = map[service];
    if (!host) throw new Error(`Unknown OCI service: ${service}`);
    return host;
  }

  /**
   * @param {{ service: string, method?: string, path: string, query?: Record<string,string|undefined>, body?: object|null }} opts
   */
  async request({ service, method = 'GET', path, query = {}, body = null }) {
    const host = this.hostFor(service);
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const pathWithQuery = qs ? `${path}?${qs}` : path;
    const url = `https://${host}${pathWithQuery}`;

    const methodUpper = method.toUpperCase();
    const date = new Date().toUTCString();
    const headers = {
      host,
      date,
      accept: 'application/json'
    };

    let bodyText = null;
    if (body != null && methodUpper !== 'GET' && methodUpper !== 'HEAD') {
      bodyText = typeof body === 'string' ? body : JSON.stringify(body);
      const hash = createHash('sha256').update(bodyText, 'utf8').digest('base64');
      headers['content-type'] = 'application/json';
      headers['content-length'] = String(Buffer.byteLength(bodyText, 'utf8'));
      headers['x-content-sha256'] = hash;
    }

    const requestTarget = `${methodUpper.toLowerCase()} ${pathWithQuery}`;
    const signingHeaders = bodyText
      ? ['(request-target)', 'host', 'date', 'x-content-sha256', 'content-type', 'content-length']
      : ['(request-target)', 'host', 'date'];

    const signingString = signingHeaders
      .map((h) => {
        if (h === '(request-target)') return `(request-target): ${requestTarget}`;
        return `${h}: ${headers[h]}`;
      })
      .join('\n');

    const signer = createSign('RSA-SHA256');
    signer.update(signingString, 'utf8');
    const signature = signer.sign(this.privateKeyPem, 'base64');

    headers.authorization =
      `Signature version="1",keyId="${this.keyId}",algorithm="rsa-sha256",` +
      `headers="${signingHeaders.join(' ')}",signature="${signature}"`;

    const res = await fetch(url, {
      method: methodUpper,
      headers,
      body: bodyText
    });

    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }

    if (!res.ok) {
      const msg =
        json?.message ||
        json?.opc-request-id ||
        text ||
        `${res.status} ${res.statusText}`;
      const err = new Error(`OCI ${methodUpper} ${path}: ${res.status} ${msg}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }

    return json;
  }
}

let sharedClient = null;

export function getOciClient() {
  if (!sharedClient) {
    sharedClient = new OciClient();
  }
  return sharedClient;
}

export function resetOciClient() {
  sharedClient = null;
}

export async function safeOciCall(label, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    logger.warn(`OCI ${label} failed`, { error: e.message, status: e.status });
    return { ok: false, error: e.message, status: e.status, body: e.body };
  }
}
