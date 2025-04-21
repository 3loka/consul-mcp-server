import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConsulClient } from '../resources/consul-client.js';
import { registerActions } from '../mcp/actions.js';
import express from 'express';
import type { Express } from 'express';

export class ConsulMcpServer {
  private mcpServer: McpServer;
  private port: number;
  private app?: Express;

  constructor(consulClient: ConsulClient, port: number = 3000) {
    this.port = port;

    // Create the MCP server with basic info
    this.mcpServer = new McpServer({
      name: "consul-mcp-server",
      version: "0.1.0"
    });

    // Register MCP actions
    registerActions(this.mcpServer, consulClient);

    // Set up Express if needed (for static UI or health checks)
    this.app = express();
    this.configureExpress();
  }

  private configureExpress(): void {
    if (!this.app) return;

    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'ok' });
    });

    this.app.get('/', (_, res) => {
      res.send(`
        <html>
          <head>
            <title>Consul MCP Server</title>
            <style>
              body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: auto; }
              code { background: #eee; padding: 0.2rem 0.4rem; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Consul MCP Server</h1>
            <p>To use this server with Claude Desktop, point it to <code>http://localhost:${this.port}</code></p>
          </body>
        </html>
      `);
    });
  }

  async startWithStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error("✅ MCP Server running with stdio transport");
  }
}
