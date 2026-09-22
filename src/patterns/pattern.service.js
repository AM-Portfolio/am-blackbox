import { query } from '../database/client.js';
import { logger } from '../utils/logger.js';

export async function createOrUpdatePattern(name, signature, affectedComponent = null, description = null) {
  const result = await query(`
    INSERT INTO problem_patterns (name, signature, affected_component, description, occurrence_count, first_seen_at, last_seen_at)
    VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (name) DO UPDATE SET
      occurrence_count = problem_patterns.occurrence_count + 1,
      last_seen_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [name, JSON.stringify(signature), affectedComponent, description]);

  logger.debug(`Pattern recorded: ${name} (Occurrences: ${result.rows[0].occurrence_count})`);
  return result.rows[0];
}

export async function getPatternByName(name) {
  const result = await query('SELECT * FROM problem_patterns WHERE name = $1', [name]);
  return result.rows[0] || null;
}

export async function findSimilarPatterns(signatureKeys) {
  // A simplistic JSONB subset match for similar signatures
  // In a real production system, this could be more sophisticated
  const { rows } = await query(`
    SELECT * FROM problem_patterns
    WHERE signature ?| $1
    ORDER BY occurrence_count DESC
  `, [signatureKeys]);
  
  return rows;
}
