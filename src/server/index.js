import { config } from '../config/index.js';
import { app } from './app.js';
import { logger } from '../utils/logger.js';
import { runMigrations } from '../database/migrations.js';
import { pool } from '../database/client.js';
import { startWatchdog, stopWatchdog } from '../watchdog/watchdog.service.js';
import { startMcpServer } from '../mcp/server.js';

const PORT = config.port;
const mcpEnabled = String(process.env.MCP_ENABLED || 'false').toLowerCase() === 'true';
const watchdogEnabled = String(process.env.WATCHDOG_ENABLED || 'false').toLowerCase() === 'true';

async function start() {
  try {
    logger.info('Initializing AM Blackbox Control Plane...');

    await runMigrations();

    if (mcpEnabled) {
      await startMcpServer();
    } else {
      logger.info('MCP server skipped (MCP_ENABLED!=true)');
    }

    const server = app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });

    if (watchdogEnabled) {
      startWatchdog();
    } else {
      logger.info('Watchdog skipped (WATCHDOG_ENABLED!=true)');
    }

    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        if (watchdogEnabled) {
          stopWatchdog();
        }
        try {
          await pool.end();
          logger.info('Database pool closed.');
        } catch (err) {
          logger.error('Error closing database pool', { error: err.message });
        }
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

start();
