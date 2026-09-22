import { config } from './src/config/index.js';
import { queryMetrics } from './src/integrations/grafana/grafana.metrics.js';
import { queryLogsRange } from './src/integrations/grafana/grafana.logs.js';
import { getTrace } from './src/integrations/grafana/grafana.traces.js';
import { logger } from './src/utils/logger.js';

async function testGrafana() {
  logger.info('Testing Grafana Connection...');
  logger.info(`Using URL: ${config.grafana.url}`);
  
  try {
    // 1. Test Metrics (Prometheus)
    logger.info('Testing Metrics (Prometheus)...');
    const metricRes = await queryMetrics('up');
    logger.info(`Metrics test success! Result status: ${metricRes.status}`);
    
    // 2. Test Logs (Loki)
    logger.info('Testing Logs (Loki)...');
    const now = Date.now() * 1000000;
    const start = (Date.now() - 3600000) * 1000000;
    const logRes = await queryLogsRange('{job=~".+"}', start, now, 5);
    logger.info(`Logs test success! Result status: ${logRes.status}`);

    // 3. Test Traces (Tempo)
    logger.info('Testing Traces (Tempo)...');
    try {
      // Just test authentication by hitting the Search endpoint or a dummy trace
      // If we don't have a real trace ID, it might return 404 which is still a success for connectivity.
      const traceRes = await getTrace('0123456789abcdef0123456789abcdef');
      logger.info('Traces test success!');
    } catch (e) {
      if (e.status === 404 || (e.details && e.details.status === 404)) {
        logger.info('Traces test success! (Received expected 404 for dummy hex trace ID)');
      } else {
        throw e;
      }
    }

    logger.info('All Grafana tests passed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Grafana test failed:', error);
    process.exit(1);
  }
}

testGrafana();
