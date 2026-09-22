import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { withRetry } from '../../utils/retry.js';
import { AppError } from '../../utils/errors.js';

export class GrafanaClientError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'GRAFANA_CLIENT_ERROR', details);
  }
}

function basicAuthHeader(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
}

/**
 * Grafana HTTP API (Bearer) — needs stack URL + service account / API key.
 */
export async function grafanaRequest(path, options = {}) {
  const { url, saToken } = config.grafana;

  if (!url || !saToken) {
    throw new GrafanaClientError('Grafana configuration is missing');
  }

  const endpoint = `${url.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const fetchOptions = {
    ...options,
    headers: {
      Authorization: `Bearer ${saToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers
    }
  };

  logger.debug(`Grafana API Request: ${options.method || 'GET'} ${endpoint}`);

  return withRetry(async () => {
    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      throw new GrafanaClientError(`Grafana API responded with status ${response.status}`, {
        status: response.status,
        response: text,
        endpoint
      });
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  });
}

/**
 * Direct Prometheus (Grafana Cloud) query using access-policy token as password.
 */
export async function prometheusRequest(pathWithQuery) {
  const { apiToken, prometheusUrl, prometheusUsername } = config.grafana;
  if (!apiToken || !prometheusUrl || !prometheusUsername) {
    throw new GrafanaClientError('Prometheus cloud configuration is missing');
  }
  const base = prometheusUrl.replace(/\/api\/prom\/push\/?$/, '');
  const endpoint = `${base}/api/prom${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;

  return withRetry(async () => {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: basicAuthHeader(prometheusUsername, apiToken),
        Accept: 'application/json'
      }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new GrafanaClientError(`Prometheus responded with status ${response.status}`, {
        status: response.status,
        response: text.slice(0, 200)
      });
    }
    return JSON.parse(text);
  });
}

/**
 * Direct Loki (Grafana Cloud) query using access-policy token as password.
 */
export async function lokiRequest(pathWithQuery) {
  const { apiToken, lokiUrl, lokiUsername } = config.grafana;
  if (!apiToken || !lokiUrl || !lokiUsername) {
    throw new GrafanaClientError('Loki cloud configuration is missing');
  }
  const base = lokiUrl.replace(/\/loki\/api\/v1\/push\/?$/, '');
  const endpoint = `${base}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;

  return withRetry(async () => {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: basicAuthHeader(lokiUsername, apiToken),
        Accept: 'application/json'
      }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new GrafanaClientError(`Loki responded with status ${response.status}`, {
        status: response.status,
        response: text.slice(0, 200)
      });
    }
    return JSON.parse(text);
  });
}
