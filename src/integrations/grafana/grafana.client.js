import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { withRetry } from '../../utils/retry.js';
import { AppError } from '../../utils/errors.js';

export class GrafanaClientError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'GRAFANA_CLIENT_ERROR', details);
  }
}

/**
 * Base client for interacting with Grafana Cloud APIs.
 */
export async function grafanaRequest(path, options = {}) {
  const { url, apiToken } = config.grafana;
  
  if (!url || !apiToken) {
    throw new GrafanaClientError('Grafana configuration is missing');
  }

  const endpoint = `${url.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  
  const fetchOptions = {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

    // Return text if response is not JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  });
}
