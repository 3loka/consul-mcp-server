import { z } from 'zod';

// Define schemas for the MCP actions

// Schema for GetServices action
export const GetServicesSchema = z.object({});

export const GetServicesResponseSchema = z.object({
  services: z.array(z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    port: z.number(),
    tags: z.array(z.string()),
    health: z.object({
      status: z.string(),
      checks: z.array(z.object({
        id: z.string(),
        name: z.string(),
        status: z.string(),
        output: z.string().optional(),
      }).optional()).optional(),
    }).optional(),
  })),
});

// Schema for GetHealthChecks action
export const GetHealthChecksSchema = z.object({
  failing_only: z.boolean().optional(),
});

export const GetHealthChecksResponseSchema = z.object({
  health_checks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    service_name: z.string().optional(),
    output: z.string().optional(),
    analysis: z.object({
      possible_issues: z.array(z.string()).optional(),
      remediation: z.array(z.string()).optional(),
      severity: z.string().optional(),
    }).optional(),
  })),
});

// Schema for GetServiceConnections action
export const GetServiceConnectionsSchema = z.object({
  failing_only: z.boolean().optional(),
});

export const GetServiceConnectionsResponseSchema = z.object({
  connections: z.array(z.object({
    source: z.string(),
    destination: z.string(),
    status: z.string(),
    protocol: z.string().optional(),
    latency: z.number().optional(),
    error_rate: z.number().optional(),
    error_message: z.string().optional(),
  })),
});

// Schema for CreateServiceDiagram action
export const CreateServiceDiagramSchema = z.object({
  include_health: z.boolean().optional(),
  include_metrics: z.boolean().optional(),
});

export const CreateServiceDiagramResponseSchema = z.object({
  diagram: z.string(),
  format: z.string(), // "mermaid", "graphviz", etc.
});

// Schema for AnalyzeService action
export const AnalyzeServiceSchema = z.object({
  service_name: z.string(),
});

export const AnalyzeServiceResponseSchema = z.object({
  service: z.object({
    name: z.string(),
    health: z.object({
      status: z.string(),
      checks: z.array(z.object({
        name: z.string(),
        status: z.string(),
        output: z.string().optional(),
      })).optional(),
    }),
    connections: z.object({
      incoming: z.array(z.object({
        source: z.string(),
        status: z.string(),
      })).optional(),
      outgoing: z.array(z.object({
        destination: z.string(),
        status: z.string(),
      })).optional(),
    }).optional(),
    metrics: z.object({
      cpu_usage: z.number().optional(),
      memory_usage: z.number().optional(),
      request_rate: z.number().optional(),
      error_rate: z.number().optional(),
    }).optional(),
  }),
  analysis: z.object({
    issues: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
  }),
});

// Schema for GetServiceMetrics action
export const GetServiceMetricsSchema = z.object({
  service_name: z.string(),
});

export const GetServiceMetricsResponseSchema = z.object({
  metrics: z.object({
    service_name: z.string(),
    cpu: z.object({
      usage: z.number(),
      cores: z.number().optional(),
    }).optional(),
    memory: z.object({
      used: z.number().optional(),
      total: z.number().optional(),
    }).optional(),
    network: z.object({
      rxBytes: z.number().optional(),
      txBytes: z.number().optional(),
    }).optional(),
    request_rate: z.number().optional(),
    error_rate: z.number().optional(),
    response_time: z.object({
      p50: z.number().optional(),
      p90: z.number().optional(),
      p99: z.number().optional(),
    }).optional(),
  }),
});

// Define MCP action names
export const MCP_ACTIONS = {
  GET_SERVICES: 'get_services',
  GET_HEALTH_CHECKS: 'get_health_checks',
  GET_SERVICE_CONNECTIONS: 'get_service_connections',
  CREATE_SERVICE_DIAGRAM: 'create_service_diagram',
  ANALYZE_SERVICE: 'analyze_service',
  GET_SERVICE_METRICS: 'get_service_metrics',
};

// Define the console message templates for better outputs
export const CONSOLE_TEMPLATES = {
  GET_SERVICES: 'Getting list of services from Consul',
  GET_HEALTH_CHECKS: 'Retrieving health checks from Consul',
  GET_SERVICE_CONNECTIONS: 'Getting service connections information',
  CREATE_SERVICE_DIAGRAM: 'Generating service mesh diagram',
  ANALYZE_SERVICE: 'Analyzing service: {{service_name}}',
  GET_SERVICE_METRICS: 'Retrieving metrics for service: {{service_name}}',
};