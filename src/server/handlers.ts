import { Request, Response } from 'express';
import { ConsulClient } from '../resources/consul-client.js';
import { ServiceManager } from '../resources/services.js';
import { HealthManager } from '../resources/health.js';
import { DiagramGenerator } from '../tools/diagram-generator.js';
import { ServiceAnalyzer } from '../tools/status-analyzer.js';

/**
 * Handlers for additional Express routes
 * These provide REST API access to the same functionality as the MCP actions
 */
export class ApiHandlers {
  private consulClient: ConsulClient;
  private serviceManager: ServiceManager;
  private healthManager: HealthManager;
  private diagramGenerator: DiagramGenerator;
  private serviceAnalyzer: ServiceAnalyzer;
  
  /**
   * Creates API handlers
   * @param consulClient Initialized ConsulClient
   */
  constructor(consulClient: ConsulClient) {
    this.consulClient = consulClient;
    this.serviceManager = new ServiceManager(consulClient);
    this.healthManager = new HealthManager(consulClient);
    this.diagramGenerator = new DiagramGenerator();
    this.serviceAnalyzer = new ServiceAnalyzer(consulClient);
  }
  
  /**
   * Gets all services
   */
  getServices = async (req: Request, res: Response): Promise<void> => {
    try {
      const services = await this.consulClient.getServices();
      res.json({ services });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get services',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * Gets health checks
   */
  getHealthChecks = async (req: Request, res: Response): Promise<void> => {
    try {
      const failingOnly = req.query.failing_only === 'true';
      
      let healthChecks;
      if (failingOnly) {
        healthChecks = await this.healthManager.getFailingHealthChecks();
      } else {
        healthChecks = await this.healthManager.getAllHealthChecks();
      }
      
      res.json({ health_checks: healthChecks });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get health checks',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * Gets service connections
   */
  getServiceConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const failingOnly = req.query.failing_only === 'true';
      
      let connections;
      if (failingOnly) {
        connections = await this.consulClient.getFailingConnections();
      } else {
        connections = await this.consulClient.getServiceConnections();
      }
      
      res.json({ connections });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get service connections',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * Creates service diagram
   */
  createServiceDiagram = async (req: Request, res: Response): Promise<void> => {
    try {
      const includeHealth = req.query.include_health === 'true';
      const includeMetrics = req.query.include_metrics === 'true';
      
      const services = await this.consulClient.getServices();
      const connections = await this.consulClient.getServiceConnections();
      
      const diagram = await this.diagramGenerator.generateServiceDiagram(
        services, 
        connections,
        {
          includeHealth,
          includeMetrics
        }
      );
      
      res.json({ 
        diagram,
        format: "mermaid"
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to create service diagram',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * Analyzes a service
   */
  analyzeService = async (req: Request, res: Response): Promise<void> => {
    try {
      const serviceName = req.params.serviceName;
      
      if (!serviceName) {
        res.status(400).json({ error: 'Service name is required' });
        return;
      }
      
      const serviceDetails = await this.serviceManager.getServiceByName(serviceName);
      
      if (!serviceDetails) {
        res.status(404).json({ error: `Service ${serviceName} not found` });
        return;
      }
      
      const analysis = await this.serviceAnalyzer.analyzeService(serviceName);
      const metrics = await this.serviceManager.getServiceMetrics(serviceName);
      
      res.json({
        service: {
          name: serviceDetails.name,
          health: serviceDetails.health,
          connections: serviceDetails.connections,
          metrics: {
            cpu_usage: metrics.cpu.usage,
            memory_usage: metrics.memory.used / metrics.memory.total,
            request_rate: metrics.requestRate,
            error_rate: metrics.errorRate
          }
        },
        analysis
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to analyze service',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * Gets service metrics
   */
  getServiceMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const serviceName = req.params.serviceName;
      
      if (!serviceName) {
        res.status(400).json({ error: 'Service name is required' });
        return;
      }
      
      const metrics = await this.serviceManager.getServiceMetrics(serviceName);
      
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get service metrics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * Analyzes the entire service mesh
   */
  analyzeServiceMesh = async (req: Request, res: Response): Promise<void> => {
    try {
      const analysis = await this.serviceAnalyzer.analyzeServiceMesh();
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to analyze service mesh',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
}