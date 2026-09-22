import { ValidationError } from './errors.js';

/**
 * Validates that all required fields are present in the given object.
 * @param {Object} obj - The object to validate.
 * @param {string[]} requiredFields - Array of required field names.
 * @throws {ValidationError}
 */
export function requireFields(obj, requiredFields) {
  if (!obj || typeof obj !== 'object') {
    throw new ValidationError('Invalid input object');
  }

  const missing = requiredFields.filter(field => obj[field] === undefined || obj[field] === null || obj[field] === '');
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, { missing });
  }
}
