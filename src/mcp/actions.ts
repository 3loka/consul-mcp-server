import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConsulClient } from '../resources/consul-client.js';
import { ServiceManager } from '../resources/services.js';
import { HealthManager } from '../resources/health.js';
import { DiagramGenerator } from '../tools/diagram-generator.js';
import { ServiceAnalyzer } from '../tools/status-analyzer.js';

import {
  MCP_ACTIONS,
  GetServicesSchema,
  GetHealthChecksSchema,
  GetServiceConnectionsSchema,
  CreateServiceDiagramSchema,
  AnalyzeServiceSchema,
  GetServiceMetricsSchema
} from './protocol.js';

export function registerActions(server: McpServer, consulClient: ConsulClient): void {
  const serviceManager = new ServiceManager(consulClient);
  const healthManager = new HealthManager(consulClient);
  const diagramGenerator = new DiagramGenerator();
  const serviceAnalyzer = new ServiceAnalyzer(consulClient);

  server.tool(
    MCP_ACTIONS.GET_SERVICES,
    GetServicesSchema.shape,
    async (_args, _extra) => {
      console.error("Tool called: GET_SERVICES");
      const services = await consulClient.getServices();
      const data = {
        services: services.map(service => ({
          id: service.id,
          name: service.name,
          address: service.address,
          port: service.port.toString(),
          tags: service.tags,
          node: service.node,
          health: {
            status: service.health.status,
            checks: service.health.checks.map(check => ({
              id: check.id,
              name: check.name,
              status: check.status,
              output: check.output
            }))
          }
        }))
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    MCP_ACTIONS.GET_HEALTH_CHECKS,
    z.object({
      failing_only: z.boolean().optional().default(false)
    }).shape,
    async (args, _extra) => {
      const healthChecks = args.failing_only
        ? await healthManager.getFailingHealthChecks()
        : await healthManager.getAllHealthChecks();
  
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              health_checks: healthChecks.map(check => ({
                id: check.id,
                name: check.name,
                status: check.status,
                service_name: check.serviceName,
                output: check.output,
                analysis: check.analysis
              }))
            }, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    MCP_ACTIONS.GET_SERVICE_CONNECTIONS,
    z.object({
      failing_only: z.boolean().optional().default(false)
    }).shape,
    async (args, _extra) => {
      const failingOnly = args.failing_only ?? false;

      const connections = args.failing_only
        ? await consulClient.getFailingConnections()
        : await consulClient.getServiceConnections();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              connections: connections.map(conn => ({
                source: conn.source,
                destination: conn.destination,
                status: conn.status,
                protocol: conn.protocol,
                latency: conn.latency,
                error_rate: conn.errorRate,
                error_message: conn.errorMessage
              }))
            }, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    MCP_ACTIONS.CREATE_SERVICE_DIAGRAM,
    z.object({
      include_health: z.boolean().optional().default(false),
      include_metrics: z.boolean().optional().default(false)
    }).shape,
    async (args, _extra) => {

      const services = await consulClient.getServices();
      const connections = await consulClient.getServiceConnections();

      const diagram = await diagramGenerator.generateServiceDiagram(
        services,
        connections,
        {
          includeHealth: args.include_health ?? false,
          includeMetrics: args.include_metrics ?? false
        }
      );

      return {
        content: [
          {
            type: "text",
            text: diagram
          }
        ]
      };
    }
  );

  server.tool(
    MCP_ACTIONS.ANALYZE_SERVICE,
    z.object({
      service_name: z.string().optional().default("consul"),
    }).shape,
    async (args, _extra) => {
      const serviceDetails = await serviceManager.getServiceByName(args.service_name);
      if (!serviceDetails) {
        throw new Error(`Service ${args.service_name} not found`);
      }

      const analysis = await serviceAnalyzer.analyzeService(args.service_name);
      const metrics = await serviceManager.getServiceMetrics(args.service_name);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              service: {
                name: serviceDetails.name,
                health: serviceDetails.health,
                connections: serviceDetails.connections,
                metrics
              },
              analysis
            }, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    MCP_ACTIONS.GET_SERVICE_METRICS,
    z.object({
      service_name: z.string().optional().default("consul"),
    }).shape,
    async (args, _extra) => {
      const metrics = await serviceManager.getServiceMetrics(args.service_name);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ metrics }, null, 2)
          }
        ]
      };
    }
  );
}