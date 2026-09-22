import { pool } from '../database/client.js';
import { config } from '../config/index.js';

export async function checkDependenciesHealth() {
  const dbHealth = await checkDatabaseHealth();
  
  // Later we can add Grafana and Zoho health checks here
  
  return {
    status: dbHealth.status === 'up' ? 'healthy' : 'degraded',
    database: dbHealth
  };
}

async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    return {
      status: 'up',
      latencyMs: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message
    };
  }
}
