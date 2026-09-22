import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

/**
 * Execute a query on the database.
 * @param {string} text 
 * @param {any[]} params 
 * @returns {Promise<any>}
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error', { error: error.message, text });
    throw error;
  }
}

/**
 * Execute a function within a transaction.
 * @param {function} callback 
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
