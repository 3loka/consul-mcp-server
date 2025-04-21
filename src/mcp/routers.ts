

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_ACTIONS } from './protocol.js';

/**
 * Logs server startup info — not dynamic metadata or middleware, just a setup helper.
 * @param server The MCP server instance
 */
export function configureRouter(server: McpServer): void {
  // Log available tools for debugging
  console.error(`[MCP] Registered tools:`);

  // List each registered action you care about
  const actions = [
    MCP_ACTIONS.GET_SERVICES,
    MCP_ACTIONS.GET_HEALTH_CHECKS,
    MCP_ACTIONS.GET_SERVICE_CONNECTIONS,
    MCP_ACTIONS.CREATE_SERVICE_DIAGRAM,
    MCP_ACTIONS.ANALYZE_SERVICE,
    MCP_ACTIONS.GET_SERVICE_METRICS
  ];

  for (const action of actions) {
    console.error(` - ${action}`);
  }

  // Optional: Set on your own app-level log or context if needed
  console.error(`[MCP] Consul MCP server initialized`);
}