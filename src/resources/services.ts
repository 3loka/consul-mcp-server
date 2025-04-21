// src/resources/services.ts
import { ConsulClient, ConsulService, ServiceConnection } from './consul-client.js';

/**
 * ServiceManager provides higher-level operations for working with Consul services
 */
export class ServiceManager {
  private consulClient: ConsulClient;
  
  /**
   * Creates a new ServiceManager
   * @param consulClient An initialized ConsulClient
   */
  constructor(consulClient: ConsulClient) {
    this.consulClient = consulClient;
  }
  
  /**
   * Gets all services with detailed information
   * @returns Promise resolving to array of detailed service information
   */
  async getAllServices(): Promise<ServiceDetails[]> {
    const services = await this.consulClient.getServices();
    const connections = await this.consulClient.getServiceConnections();
    
    return services.map(service => this.enrichServiceDetails(service, connections));
  }
  
  /**
   * Gets a specific service by name
   * @param serviceName The name of the service to get
   * @returns Promise resolving to service details or null if not found
   */
  async getServiceByName(serviceName: string): Promise<ServiceDetails | null> {
    const services = await this.consulClient.getServices();
    const connections = await this.consulClient.getServiceConnections();
    
    const service = services.find(s => s.name === serviceName);
    if (!service) return null;
    
    return this.enrichServiceDetails(service, connections);
  }
  
  /**
   * Gets failing services (services with critical health status)
   * @returns Promise resolving to array of failing services
   */
  async getFailingServices(): Promise<ServiceDetails[]> {
    const services = await this.consulClient.getServices();
    const connections = await this.consulClient.getServiceConnections();
    
    const failingServices = services.filter(
      service => service.health.status === 'critical' || service.health.status === 'warning'
    );
    
    return failingServices.map(service => this.enrichServiceDetails(service, connections));
  }
  
  /**
   * Gets service dependencies and dependents
   * @param serviceName The name of the service
   * @returns Promise resolving to dependency information
   */
  async getServiceDependencies(serviceName: string): Promise<ServiceDependencyInfo> {
    const connections = await this.consulClient.getServiceConnections();
    
    // Find connections where this service is the source (dependencies)
    const dependencies = connections.filter(conn => conn.source === serviceName)
      .map(conn => conn.destination);
    
    // Find connections where this service is the destination (dependents)
    const dependents = connections.filter(conn => conn.destination === serviceName)
      .map(conn => conn.source);
    
    return {
      serviceName,
      dependencies: [...new Set(dependencies)], // Remove duplicates
      dependents: [...new Set(dependents)],     // Remove duplicates
      connections: connections.filter(
        conn => conn.source === serviceName || conn.destination === serviceName
      )
    };
  }
  
  /**
   * Gets service utilization metrics
   * Note: In a real implementation, this would come from metrics servers
   * like Prometheus or Consul Telemetry. Here we simulate for demo purposes.
   * @param serviceName The name of the service
   * @returns Promise resolving to simulated metrics
   */
  async getServiceMetrics(serviceName: string): Promise<ServiceMetrics> {
    // Create a deterministic seed based on service name
    const seed = this.hashString(serviceName);
    const rand = this.seededRandom(seed);
    
    // Simulate realistic metrics
    return {
      serviceName,
      cpu: {
        usage: rand() * 0.8, // 0-80% usage
        cores: Math.floor(rand() * 4) + 1 // 1-4 cores
      },
      memory: {
        used: Math.floor(rand() * 900) + 100, // 100-1000 MB
        total: 1024 // 1 GB total
      },
      network: {
        rxBytes: Math.floor(rand() * 100000),
        txBytes: Math.floor(rand() * 100000)
      },
      requestRate: Math.floor(rand() * 1000), // requests per minute
      errorRate: rand() * 0.1, // 0-10% error rate
      responseTime: {
        p50: Math.floor(rand() * 100) + 20, // 20-120ms
        p90: Math.floor(rand() * 200) + 100, // 100-300ms
        p99: Math.floor(rand() * 500) + 200 // 200-700ms
      }
    };
  }
  
  /**
   * Enriches basic service information with connection details
   * @param service The base service information
   * @param connections Array of service connections
   * @returns Enriched service details
   */
  private enrichServiceDetails(
    service: ConsulService, 
    connections: ServiceConnection[]
  ): ServiceDetails {
    // Get connections related to this service
    const incomingConnections = connections.filter(
      conn => conn.destination === service.name
    );
    
    const outgoingConnections = connections.filter(
      conn => conn.source === service.name
    );
    
    // Build the enriched service details
    return {
      ...service,
      connections: {
        incoming: incomingConnections,
        outgoing: outgoingConnections
      },
      summary: {
        healthStatus: service.health.status,
        checkCount: service.health.checks.length,
        incomingConnectionCount: incomingConnections.length,
        outgoingConnectionCount: outgoingConnections.length,
        hasFailingConnections: 
          incomingConnections.some(c => 
            c.status === 'degraded' || c.status === 'failing' || c.status === 'blocked'
          ) ||
          outgoingConnections.some(c => 
            c.status === 'degraded' || c.status === 'failing' || c.status === 'blocked'
          ),
        hasFailingHealthChecks: 
          service.health.checks.some(c => 
            c.status === 'warning' || c.status === 'critical'
          )
      }
    };
  }
  
  /**
   * Creates a simple hash from a string
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Creates a seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    return function() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  }
}

// Type definitions

export interface ServiceDetails extends ConsulService {
  connections: {
    incoming: ServiceConnection[];
    outgoing: ServiceConnection[];
  };
  summary: {
    healthStatus: string;
    checkCount: number;
    incomingConnectionCount: number;
    outgoingConnectionCount: number;
    hasFailingConnections: boolean;
    hasFailingHealthChecks: boolean;
  };
}

export interface ServiceDependencyInfo {
  serviceName: string;
  dependencies: string[]; // Services this service depends on
  dependents: string[];   // Services that depend on this service
  connections: ServiceConnection[];
}

export interface ServiceMetrics {
  serviceName: string;
  cpu: {
    usage: number; // 0-1 (percentage as decimal)
    cores: number;
  };
  memory: {
    used: number;  // MB
    total: number; // MB
  };
  network: {
    rxBytes: number;
    txBytes: number;
  };
  requestRate: number; // Requests per minute
  errorRate: number;   // 0-1 (percentage as decimal)
  responseTime: {
    p50: number; // ms
    p90: number; // ms
    p99: number; // ms
  };
}