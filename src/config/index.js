import { databaseConfig } from './database.js';
import { grafanaConfig } from './grafana.js';
import { kubernetesConfig } from './kubernetes.js';
import { zohoConfig } from './zoho.js';
import { oracleConfig } from './oracle.js';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  
  database: databaseConfig,
  grafana: grafanaConfig,
  kubernetes: kubernetesConfig,
  zoho: zohoConfig,
  oracle: oracleConfig,

  security: {
    mcpApiKey: process.env.MCP_API_KEY,
    actionTokenSecret: process.env.ACTION_TOKEN_SECRET
  }
};
