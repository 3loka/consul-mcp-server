import { ConsulClient } from '../resources/consul-client.js';
import { ServiceManager } from '../resources/services.js';
import { HealthManager } from '../resources/health.js';

/**
 * Interface for service analysis results
 */
export interface ServiceAnalysis {
  issues: string[];
  recommendations: string[];
}

/**
 * ServiceAnalyzer provides analysis of service health and performance
 */
export class ServiceAnalyzer {
  private consulClient: ConsulClient;
  private serviceManager: ServiceManager;
  private healthManager: HealthManager;
  
  /**
   * Creates a new ServiceAnalyzer
   * @param consulClient An initialized ConsulClient
   */
  constructor(consulClient: ConsulClient) {
    this.consulClient = consulClient;
    this.serviceManager = new ServiceManager(consulClient);
    this.healthManager = new HealthManager(consulClient);
  }
  
  /**
   * Analyzes a service to identify issues and provide recommendations
   * @param serviceName The name of the service to analyze
   * @returns Analysis results
   */
  async analyzeService(serviceName: string): Promise<ServiceAnalysis> {
    const service = await this.serviceManager.getServiceByName(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze health checks
    if (service.summary.hasFailingHealthChecks) {
      const failingChecks = service.health.checks.filter(
        check => check.status === 'warning' || check.status === 'critical'
      );
      
      for (const check of failingChecks) {
        issues.push(`Health check "${check.name}" is ${check.status}: ${check.output}`);
      }
      
      // Get recommendations based on check output
      const checkOutputs = failingChecks.map(check => check.output.toLowerCase());
      
      if (checkOutputs.some(output => output.includes('timeout'))) {
        recommendations.push('Check for slow response times or overloaded resources');
      }
      
      if (checkOutputs.some(output => output.includes('connection refused'))) {
        recommendations.push('Verify the service is running and accepting connections');
      }
      
      if (checkOutputs.some(output => output.includes('disk') || output.includes('storage'))) {
        recommendations.push('Increase available disk space or clean up logs/temporary files');
      }
      
      if (checkOutputs.some(output => /HTTP.*[45]\d\d/.test(output))) {
        recommendations.push('Investigate HTTP errors in service logs');
      }
    }
    
    // Analyze incoming connections
    const failingIncoming = service.connections.incoming.filter(
      conn => conn.status === 'degraded' || conn.status === 'failing' || conn.status === 'blocked'
    );
    
    if (failingIncoming.length > 0) {
      issues.push(`${failingIncoming.length} incoming connections are experiencing issues`);
      
      // Group by source to make recommendations more readable
      const sources = new Set(failingIncoming.map(conn => conn.source));
      if (sources.size > 0) {
        recommendations.push(`Check connectivity from services: ${Array.from(sources).join(', ')}`);
      }
    }
    
    // Analyze outgoing connections
    const failingOutgoing = service.connections.outgoing.filter(
      conn => conn.status === 'degraded' || conn.status === 'failing' || conn.status === 'blocked'
    );
    
    if (failingOutgoing.length > 0) {
      issues.push(`${failingOutgoing.length} outgoing connections are experiencing issues`);
      
      // Group by destination to make recommendations more readable
      const destinations = new Set(failingOutgoing.map(conn => conn.destination));
      if (destinations.size > 0) {
        recommendations.push(`Check connectivity to services: ${Array.from(destinations).join(', ')}`);
      }
    }
    
    // Analyze service mesh configuration
    const meshConnections = [
      ...service.connections.incoming,
      ...service.connections.outgoing
    ].filter(conn => conn.usesServiceMesh);
    
    if (meshConnections.length > 0) {
      const blockedConnections = meshConnections.filter(conn => conn.status === 'blocked');
      
      if (blockedConnections.length > 0) {
        issues.push(`${blockedConnections.length} connections are blocked by service mesh intentions`);
        recommendations.push('Review service mesh intentions to ensure they match expected traffic patterns');
      }
    }
    
    // Get metrics for additional insights
    try {
      const metrics = await this.serviceManager.getServiceMetrics(serviceName);
      
      if (metrics.errorRate > 0.05) {
        issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
        recommendations.push('Investigate application logs for errors');
      }
      
      if (metrics.cpu.usage > 0.8) {
        issues.push(`High CPU usage: ${(metrics.cpu.usage * 100).toFixed(1)}%`);
        recommendations.push('Consider scaling horizontally or optimizing resource usage');
      }
      
      if (metrics.memory.used / metrics.memory.total > 0.9) {
        issues.push(`High memory usage: ${metrics.memory.used}/${metrics.memory.total} MB`);
        recommendations.push('Check for memory leaks or increase memory allocation');
      }
      
      if (metrics.responseTime.p99 > 500) {
        issues.push(`Slow response times (p99): ${metrics.responseTime.p99}ms`);
        recommendations.push('Optimize critical paths or add caching');
      }
    } catch (error) {
      // Metrics might not be available, continue without them
    }
    
    // If no issues found, provide a positive message
    if (issues.length === 0) {
      issues.push('No issues detected');
      recommendations.push('Continue monitoring service health');
    }
    
    return {
      issues,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }
  
  /**
   * Analyzes the overall health of the service mesh
   * @returns Analysis of the entire service mesh
   */
  async analyzeServiceMesh(): Promise<{
    summary: string;
    issues: string[];
    recommendations: string[];
  }> {
    const services = await this.consulClient.getServices();
    const connections = await this.consulClient.getServiceConnections();
    const healthSummary = await this.healthManager.getHealthSummary();
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze overall health
    if (healthSummary.critical > 0) {
      issues.push(`${healthSummary.critical} services have critical health checks`);
    }
    
    if (healthSummary.warning > 0) {
      issues.push(`${healthSummary.warning} services have warning health checks`);
    }
    
    //// Analyze failing connections
    const failingConnections = connections.filter(
        conn => conn.status === 'degraded' || conn.status === 'failing' || conn.status === 'blocked'
      );
      
      if (failingConnections.length > 0) {
        issues.push(`${failingConnections.length} connections are experiencing issues`);
        
        // Group by source and destination
        const pairs = new Set(
          failingConnections.map(conn => `${conn.source} → ${conn.destination}`)
        );
        if (pairs.size > 3) {
          issues.push(`Key problematic connections: ${Array.from(pairs).slice(0, 3).join(', ')} and others`);
        } else if (pairs.size > 0) {
          issues.push(`Problematic connections: ${Array.from(pairs).join(', ')}`);
        }
      }
      
      // Network topology analysis
      const serviceConnectivityMap = new Map<string, Set<string>>();
      for (const service of services) {
        serviceConnectivityMap.set(service.name, new Set());
      }
      
      for (const conn of connections) {
        const outgoing = serviceConnectivityMap.get(conn.source);
        if (outgoing) {
          outgoing.add(conn.destination);
        }
      }
      
      // Find isolated services
      const isolatedServices = [];
      for (const [serviceName, connections] of serviceConnectivityMap.entries()) {
        const hasIncoming = connections.size > 0;
        const hasOutgoing = Array.from(serviceConnectivityMap.values())
          .some(outgoing => outgoing.has(serviceName));
        
        if (!hasIncoming && !hasOutgoing) {
          isolatedServices.push(serviceName);
        }
      }
      
      if (isolatedServices.length > 0) {
        issues.push(`${isolatedServices.length} services appear to be isolated: ${isolatedServices.join(', ')}`);
        recommendations.push('Review isolated services to determine if they should be connected to the mesh');
      }
      
      // Find critical path services (most connected)
      const connectionCounts = new Map<string, number>();
      for (const [serviceName, outgoing] of serviceConnectivityMap.entries()) {
        connectionCounts.set(serviceName, (connectionCounts.get(serviceName) || 0) + outgoing.size);
        
        for (const target of outgoing) {
          connectionCounts.set(target, (connectionCounts.get(target) || 0) + 1);
        }
      }
      
      // Sort services by connection count
      const mostConnected = Array.from(connectionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([_, count]) => count > 2)
        .map(([name]) => name);
      
      if (mostConnected.length > 0) {
        const criticalServices = mostConnected.join(', ');
        recommendations.push(`Critical path services with most connections: ${criticalServices}. Consider monitoring these closely.`);
      }
      
      // Create summary
      let summary = `Service mesh has ${services.length} services with ${connections.length} connections. `;
      
      if (healthSummary.critical > 0 || healthSummary.warning > 0) {
        summary += `There are ${healthSummary.critical} critical and ${healthSummary.warning} warning health issues. `;
      } else {
        summary += 'All services have passing health checks. ';
      }
      
      if (failingConnections.length > 0) {
        summary += `${failingConnections.length} connections are experiencing issues.`;
      } else {
        summary += 'All connections are healthy.';
      }
      
      // If no issues found
      if (issues.length === 0) {
        issues.push('No issues detected in the service mesh');
        recommendations.push('Continue monitoring service health and connections');
      }
      
      return {
        summary,
        issues,
        recommendations: [...new Set(recommendations)] // Remove duplicates
      };
    }
  }