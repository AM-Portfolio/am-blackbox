import fs from 'fs';
import path from 'path';
import { query } from './client.js';
import { logger } from '../utils/logger.js';

export async function runMigrations() {
  logger.info('Starting database migrations...');
  
  // Ensure migrations table exists
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
  
  let files = [];
  try {
    files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  } catch (error) {
    logger.error('Failed to read migrations directory', { error: error.message });
    return;
  }

  const { rows } = await query('SELECT name FROM migrations');
  const executedMigrations = new Set(rows.map(r => r.name));

  for (const file of files) {
    if (!executedMigrations.has(file)) {
      logger.info(`Executing migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await query(sql);
        await query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        logger.info(`Successfully executed migration: ${file}`);
      } catch (error) {
        logger.error(`Migration ${file} failed`, { error: error.message });
        throw error;
      }
    }
  }

  logger.info('Database migrations completed.');
}
