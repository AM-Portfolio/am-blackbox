import { logger } from './logger.js';

/**
 * Retries an asynchronous function with exponential backoff.
 * @param {Function} fn - The asynchronous function to retry.
 * @param {Object} options - Retry options.
 * @param {number} [options.maxRetries=3] - Maximum number of retries.
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds.
 * @param {number} [options.maxDelay=10000] - Maximum delay in milliseconds.
 * @returns {Promise<any>}
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(`Operation failed after ${maxRetries} retries`, { error: error.message });
        throw error;
      }

      attempt++;
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      logger.warn(`Operation failed, retrying (${attempt}/${maxRetries}) in ${delay}ms`, { error: error.message });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
