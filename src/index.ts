#!/usr/bin/env node
import { registerActions } from "./mcp/actions.js";
import { registerTemplates } from "./prompts/templates.js"; 


// Polyfill fetch for Node.js versions < 18
import fetch from "node-fetch";
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Remove the HTTP transport import
// import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { config } from 'dotenv';

import { z } from "zod";

// Import handlers from resources
import { createConsulClient } from './resources/consul-client.js';
import { ServiceManager } from './resources/services.js';
import { HealthManager } from './resources/health.js';
import { DiagramGenerator } from './tools/diagram-generator.js';
import { ServiceAnalyzer } from './tools/status-analyzer.js';

// Load environment variables
config();

// Default configuration values
const DEFAULT_CONSUL_HTTP_ADDR = 'http://localhost:8500';
const SERVER_NAME = "consul-mcp-server";
const VERSION = "0.1.0";

// ... [rest of your Zod schemas] ...

async function main() {
  try {
    const consulAddr = process.env.CONSUL_HTTP_ADDR || DEFAULT_CONSUL_HTTP_ADDR;
    const consulToken = process.env.CONSUL_HTTP_TOKEN || undefined;
    
    console.error(`Starting Consul MCP Server...`);
    console.error(`Connecting to Consul at: ${consulAddr}`);
    
    // Initialize Consul client
    const consulClient = await createConsulClient(consulAddr, consulToken);
    
    // Initialize service managers
    const serviceManager = new ServiceManager(consulClient);
    const healthManager = new HealthManager(consulClient);
    const diagramGenerator = new DiagramGenerator();
    const serviceAnalyzer = new ServiceAnalyzer(consulClient);
    
    // Test connection to Consul
    try {
      await consulClient.testConnection();
      console.error('Successfully connected to Consul');
    } catch (error) {
      console.error('Failed to connect to Consul:', error);
      console.error('The server will start, but functionality may be limited');
    }
    
    // --- Create MCP Server ---
    const server = new McpServer({
      name: SERVER_NAME,
      version: VERSION
    });
    
    // Register tools as before...
    registerActions(server, consulClient);

// Register a high-level "root" Consul resource that links to subresources
server.resource("consul", "consul://", async () => {
  console.error("Read requested for consul://");
  return {
    contents: [
      {
        uri: "consul://",
        text: JSON.stringify({
          type: "success",
          resources: [
            {
              uri: "consul://services",
              title: "Registered Consul Services"
            },
            {
              uri: "consul://health-summary",
              title: "Consul Health Summary"
            }
          ]
        }, null, 2)
      }
    ]
  };
});

// Register a detailed health summary resource
server.resource("health_summary", "consul://health-summary", async () => {
  console.error("Read requested for consul://health-summary");
  const summary = await healthManager.getHealthSummary();
  return {
    contents: [
      {
        uri: "consul://health-summary",
        text: JSON.stringify(summary, null, 2)
      }
    ]
  };
});

// Register a detailed services list resource
server.resource("services", "consul://services", async () => {
  console.error("Read requested for consul://services");
  const services = await serviceManager.getAllServices();
  return {
    contents: [
      {
        uri: "consul://services",
        text: JSON.stringify(services, null, 2)
      }
    ]
  };
});

    const templates = registerTemplates();
    for (const [name, template] of Object.entries(templates)) {
      server.prompt(name, (_extra) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: template
            }
          }
        ]
      }));
    }
    
    // Use only StdioServerTransport
    console.error(`Starting with StdioServerTransport`);
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    
    console.error(`Consul MCP Server running with stdio transport`);
    console.error(`For Claude Desktop, configure the MCP server in settings.`);
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.error('Shutting down...');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main function:", error);
  process.exit(1);
});