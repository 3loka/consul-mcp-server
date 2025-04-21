/**
 * Registers all prompt templates
 * @returns Record of template name to template string
 */
export function registerTemplates(): Record<string, string> {
    return {
      // Template for services overview
      "services_overview": `
  You are analyzing Consul service registry data. Here's a list of all registered services:
  
  {{#each services}}
  Service: {{name}}
  ID: {{id}}
  Address: {{address}}
  Port: {{port}}
  Tags: {{#each tags}}{{this}} {{/each}}
  Health Status: {{health.status}}
  {{#if meta}}
  Metadata:
  {{#each meta}}
    {{@key}}: {{this}}
  {{/each}}
  {{/if}}
  
  {{/each}}
  
  Please provide a summary of the service registry:
  1. How many services are registered?
  2. What are the main service categories based on tags or naming conventions?
  3. Are there any patterns or issues you notice in the service configuration?
  4. Provide recommendations for improving service organization if applicable.
  `,
  
      // Template for analyzing health checks
      "health_checks": `
  You are analyzing Consul health check data. Here's a list of health checks that are currently {{#if failingOnly}}failing{{else}}registered{{/if}}:
  
  {{#each healthChecks}}
  Check: {{name}}
  Status: {{status}}
  {{#if serviceName}}Service: {{serviceName}}{{/if}}
  {{#if output}}Output: {{output}}{{/if}}
  {{#if analysis}}
  Possible Issues:
  {{#each analysis.possibleIssues}}
  - {{this}}
  {{/each}}
  
  Recommended Actions:
  {{#each analysis.remediation}}
  - {{this}}
  {{/each}}
  {{/if}}
  
  {{/each}}
  
  Please analyze these health checks:
  1. Summarize the overall health status of the services.
  {{#if failingOnly}}
  2. Identify patterns in the failures (are they related to specific nodes, services, or check types?).
  3. Based on the check output, suggest possible root causes for these failures.
  4. Recommend troubleshooting steps for each type of failure.
  {{else}}
  2. What percentage of checks are passing vs failing?
  3. Are there any concerning patterns in the health check configuration?
  4. How might the health check setup be improved?
  {{/if}}
  `,
  
      // Template for analyzing service connections
      "service_connections": `
  You are analyzing Consul service mesh connections. Here's data about service connections:
  
  {{#each connections}}
  Source: {{source}}
  Destination: {{destination}}
  Protocol: {{protocol}}
  Status: {{status}}
  {{#if latency}}Latency: {{formatDuration latency}}{{/if}}
  {{#if errorRate}}Error Rate: {{formatPercent errorRate}}{{/if}}
  {{#if errorMessage}}Error: {{errorMessage}}{{/if}}
  {{#if usesServiceMesh}}Using Service Mesh: Yes{{/if}}
  
  {{/each}}
  
  Please analyze these service connections:
  1. Summarize the overall connection topology.
  2. Identify which services have the most connections (incoming and outgoing).
  3. Are there any services that appear to be central to the architecture?
  {{#if failingOnly}}
  4. What patterns do you see in the failing connections?
  5. Recommend specific actions to resolve the connection issues.
  {{else}}
  4. Suggest improvements to the connection topology if applicable.
  5. Are there any potential bottlenecks or single points of failure?
  {{/if}}
  `,
  
      // Template for creating service diagram
      "create_diagram": `
  Please analyze this Mermaid diagram showing the relationships between services in our Consul service mesh.
  
  \`\`\`mermaid
  {{diagram}}
  \`\`\`
  
  Based on this diagram:
  1. Describe the overall architecture of the service mesh.
  2. Identify the key services and their roles based on their connections.
  3. Highlight any potential issues or bottlenecks in the architecture.
  4. Are there any improvements you would suggest for this service topology?
  `,
  
      // Template for analyzing a specific service
      "analyze_service": `
  You are analyzing the service "{{service.name}}" in our Consul service mesh. Here's the data:
  
  Service: {{service.name}}
  Health Status: {{service.health.status}}
  
  Health Checks:
  {{#each service.health.checks}}
  - {{name}}: {{status}}
    {{#if output}}Output: {{output}}{{/if}}
  {{/each}}
  
  Incoming Connections:
  {{#each service.connections.incoming}}
  - From {{source}} (Status: {{status}})
  {{/each}}
  
  Outgoing Connections:
  {{#each service.connections.outgoing}}
  - To {{destination}} (Status: {{status}})
  {{/each}}
  
  {{#if service.metrics}}
  Metrics:
  - CPU Usage: {{formatPercent service.metrics.cpu_usage}}
  - Memory Usage: {{formatPercent service.metrics.memory_usage}}
  - Request Rate: {{service.metrics.request_rate}} req/min
  - Error Rate: {{formatPercent service.metrics.error_rate}}
  {{/if}}
  
  Issues Identified:
  {{#each analysis.issues}}
  - {{this}}
  {{/each}}
  
  Please provide:
  1. A summary of this service's role in the architecture based on its connections.
  2. An analysis of the health issues and their potential impact.
  3. Specific recommendations to improve the service's reliability and performance.
  4. Are there any architectural changes that might benefit this service?
  `,
  
      // Template for service metrics
      "service_metrics": `
  You are analyzing metrics for the service "{{metrics.service_name}}". Here's the data:
  
  CPU:
  - Usage: {{formatPercent metrics.cpu.usage}}
  {{#if metrics.cpu.cores}}- Cores: {{metrics.cpu.cores}}{{/if}}
  
  Memory:
  - Used: {{metrics.memory.used}}MB
  - Total: {{metrics.memory.total}}MB
  - Usage: {{formatPercent (divide metrics.memory.used metrics.memory.total)}}
  
  {{#if metrics.network}}
  Network:
  - Received: {{metrics.network.rxBytes}} bytes
  - Transmitted: {{metrics.network.txBytes}} bytes
  {{/if}}
  
  Request Rate: {{metrics.request_rate}} req/min
  Error Rate: {{formatPercent metrics.error_rate}}
  
  Response Time:
  - P50 (median): {{formatDuration metrics.response_time.p50}}
  - P90: {{formatDuration metrics.response_time.p90}}
  - P99: {{formatDuration metrics.response_time.p99}}
  
  Please analyze these metrics and provide:
  1. Is this service performing within acceptable parameters?
  2. Are there any concerning metrics that should be addressed?
  3. What optimizations would you recommend based on these metrics?
  4. How does this compare to typical performance for this type of service?
  `,
  
      // Template for service mesh analysis
      "service_mesh_analysis": `
  You are analyzing the overall health and structure of a Consul service mesh. Here's the summary:
  
  {{summary}}
  
  Issues Identified:
  {{#each issues}}
  - {{this}}
  {{/each}}
  
  Please provide:
  1. An assessment of the overall service mesh health and structure.
  2. Analysis of the identified issues and their potential impact.
  3. Prioritized recommendations for improving the service mesh.
  4. Suggestions for architectural changes that might enhance reliability and performance.
  `
    };
  }