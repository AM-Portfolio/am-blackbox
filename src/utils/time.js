/**
 * Returns the current time in UTC/ISO-8601 format.
 * @returns {string}
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * Returns a time in the past relative to now.
 * @param {number} milliseconds - Time to subtract in milliseconds.
 * @returns {string}
 */
export function pastIso(milliseconds) {
  return new Date(Date.now() - milliseconds).toISOString();
}

/**
 * Parses an ISO date string to a Date object safely.
 * @param {string} isoString
 * @returns {Date|null}
 */
export function parseIso(isoString) {
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}
