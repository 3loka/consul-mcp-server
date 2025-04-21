import { ConsulService, ServiceConnection } from '../resources/consul-client.js';

export interface DiagramOptions {
  includeHealth: boolean;
  includeMetrics: boolean;
}

/**
 * DiagramGenerator creates Mermaid diagrams of service relationships
 */
export class DiagramGenerator {
  /**
   * Generates a Mermaid diagram of service relationships
   * @param services List of services
   * @param connections List of service connections
   * @param options Diagram generation options
   * @returns Mermaid diagram as a string
   */
  async generateServiceDiagram(
    services: ConsulService[], 
    connections: ServiceConnection[],
    options: DiagramOptions
  ): Promise<string> {
    // Start building the Mermaid diagram
    let diagram = 'flowchart TD\n';
    
    // Add a title
    diagram += '  subgraph "Consul Service Mesh"\n';
    
    // Add nodes for each service
    for (const service of services) {
      const serviceId = this.formatId(service.name);
      
      // Add styling based on health if requested
      if (options.includeHealth) {
        const healthStyle = this.getHealthStyle(service.health.status);
        diagram += `    ${serviceId}["${service.name}"]${healthStyle}\n`;
      } else {
        diagram += `    ${serviceId}["${service.name}"]\n`;
      }
    }
    
    diagram += '  end\n\n';
    
    // Add connections between services
    for (const connection of connections) {
      const sourceId = this.formatId(connection.source);
      const targetId = this.formatId(connection.destination);
      
      // Style connections based on status
      const connectionStyle = this.getConnectionStyle(connection.status);
      
      // Add label if metrics included
      let label = '';
      if (options.includeMetrics && connection.latency) {
        label = ` |${connection.latency}ms|`;
      }
      
      diagram += `  ${sourceId} -->`;
      if (label) {
        diagram += label;
      }
      diagram += ` ${targetId}${connectionStyle}\n`;
    }
    
    // Add legend
    diagram += '\n  %% Legend\n';
    diagram += '  subgraph "Legend"\n';
    diagram += '    healthy["Healthy Service"]:::healthy\n';
    diagram += '    warning["Warning Service"]:::warning\n';
    diagram += '    critical["Critical Service"]:::critical\n';
    diagram += '    healthy_conn["Healthy Connection"];\n';
    diagram += '    warning_conn["Warning Connection"]:::warningConn;\n';
    diagram += '    failing_conn["Failing Connection"]:::failingConn;\n';
    diagram += '  end\n\n';
    
    // Add styles
    diagram += '  %% Styles\n';
    diagram += '  classDef healthy fill:#baffc9,stroke:#00ae11,color:#000\n';
    diagram += '  classDef warning fill:#ffffba,stroke:#ffae00,color:#000\n';
    diagram += '  classDef critical fill:#ffb3ba,stroke:#ff0000,color:#000\n';
    diagram += '  classDef warningConn stroke:#ffae00,stroke-width:2px\n';
    diagram += '  classDef failingConn stroke:#ff0000,stroke-width:2px,stroke-dasharray: 5 5\n';
    
    return diagram;
  }
  
  /**
   * Formats a service name into a valid Mermaid ID
   * @param name Service name
   * @returns Formatted ID
   */
  private formatId(name: string): string {
    // Replace invalid characters and make sure it's a valid ID
    return name.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  /**
   * Gets the style class for a health status
   * @param status Health status
   * @returns Mermaid class definition
   */
  private getHealthStyle(status: string): string {
    switch (status) {
      case 'critical':
        return ':::critical';
      case 'warning':
        return ':::warning';
      case 'passing':
        return ':::healthy';
      default:
        return '';
    }
  }
  
  /**
   * Gets the style for a connection status
   * @param status Connection status
   * @returns Mermaid class definition
   */
  private getConnectionStyle(status: string): string {
    switch (status) {
      case 'degraded':
      case 'failing':
        return ':::failingConn';
      case 'warning':
        return ':::warningConn';
      case 'blocked':
        return ':::failingConn';
      default:
        return '';
    }
  }
}