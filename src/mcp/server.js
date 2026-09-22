import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerIncidentTools } from './tools/incidents.tool.js';
import { registerMetricsTools } from './tools/metrics.tool.js';
import { registerKubernetesTools } from './tools/kubernetes.tool.js';
import { registerDiagnosisTools } from './tools/diagnosis.tool.js';
import { registerPatternsTools } from './tools/patterns.tool.js';
import { registerRecoveryTools } from './tools/recovery.tool.js';
import { registerOracleTools } from './tools/oracle.tool.js';
import { logger } from '../utils/logger.js';

export async function startMcpServer() {
  logger.info('Starting MCP server for AM Blackbox over Stdio');
  
  const mcp = new McpServer({
    name: 'AM Blackbox',
    version: '1.0.0'
  });

  // Register Tools
  registerIncidentTools(mcp);
  registerMetricsTools(mcp);
  registerKubernetesTools(mcp);
  registerDiagnosisTools(mcp);
  registerPatternsTools(mcp);
  registerRecoveryTools(mcp);
  registerOracleTools(mcp);

  // Expose over stdio (useful if running as a sidecar or executed by an agent directly)
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  
  logger.info('MCP server connected via Stdio');
}
