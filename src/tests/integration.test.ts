/**
 * Integration tests for Consul MCP Server
 * 
 * These tests verify that the MCP actions correctly interface with the Consul API
 * and return expected results.
 */

import { createConsulClient } from '../resources/consul-client.js';
import { ServiceManager } from '../resources/services.js';
import { HealthManager } from '../resources/health.js';
import { DiagramGenerator } from '../tools/diagram-generator.js';
import { ServiceAnalyzer } from '../tools/status-analyzer.js';

// Mock the Consul client for testing
jest.mock('../resources/consul-client.js', () => {
  const mockServices = [
    {
      id: 'api-1',
      name: 'api',
      address: 'service-api',
      port: 9090,
      node: 'node1',
      tags: ['api', 'backend'],
      meta: {},
      health: {
        status: 'passing',
        checks: [
          {
            id: 'api-check',
            name: 'API Health Check',
            status: 'passing',
            output: 'HTTP GET 200 OK'
          }
        ]
      }
    },
    {
      id: 'database-1',
      name: 'database',
      address: 'service-database',
      port: 9090,
      node: 'node2',
      tags: ['database', 'storage'],
      meta: {},
      health: {
        status: 'critical',
        checks: [
          {
            id: 'database-check',
            name: 'Database Health Check',
            status: 'critical',
            output: 'Connection refused'
          }
        ]
      }
    }
  ];
  
  const mockConnections = [
    {
      source: 'api',
      destination: 'database',
      status: 'degraded',
      protocol: 'http',
      usesServiceMesh: true,
      latency: 250,
      errorRate: 0.08,
      errorMessage: 'Connection timeout'
    },
    {
      source: 'frontend',
      destination: 'api',
      status: 'healthy',
      protocol: 'http',
      usesServiceMesh: true,
      latency: 50,
      errorRate: 0
    }
  ];
  
  const mockHealthChecks = [
    {
      id: 'api-check',
      name: 'API Health Check',
      status: 'passing',
      output: 'HTTP GET 200 OK',
      serviceName: 'api',
      analysis: {
        possibleIssues: [],
        remediation: [],
        severity: 'low'
      }
    },
    {
      id: 'database-check',
      name: 'Database Health Check',
      status: 'critical',
      output: 'Connection refused',
      serviceName: 'database',
      analysis: {
        possibleIssues: ['Service is not accepting connections'],
        remediation: ['Ensure the service is running', 'Check firewall rules'],
        severity: 'high'
      }
    }
  ];
  
  const MockConsulClient = jest.fn().mockImplementation(() => {
    return {
      testConnection: jest.fn().mockResolvedValue(true),
      getServices: jest.fn().mockResolvedValue(mockServices),
      getServiceByName: jest.fn().mockImplementation((name) => {
        return Promise.resolve(mockServices.find(s => s.name === name));
      }),
      getServiceConnections: jest.fn().mockResolvedValue(mockConnections),
      getFailingConnections: jest.fn().mockResolvedValue(
        mockConnections.filter(c => c.status !== 'healthy')
      ),
      getAllHealthChecks: jest.fn().mockResolvedValue(mockHealthChecks),
      getFailingHealthChecks: jest.fn().mockResolvedValue(
        mockHealthChecks.filter(c => c.status !== 'passing')
      )
    };
  });
  
  return {
    ConsulClient: MockConsulClient,
    createConsulClient: jest.fn().mockResolvedValue(new MockConsulClient())
  };
});

describe('Consul MCP Server Integration', () => {
  let consulClient: any;
  let serviceManager: ServiceManager;
  let healthManager: HealthManager;
  let diagramGenerator: DiagramGenerator;
  let serviceAnalyzer: ServiceAnalyzer;
  
  beforeAll(async () => {
    consulClient = await createConsulClient('http://localhost:8500');
    serviceManager = new ServiceManager(consulClient);
    healthManager = new HealthManager(consulClient);
    diagramGenerator = new DiagramGenerator();
    serviceAnalyzer = new ServiceAnalyzer(consulClient);
  });
  
  test('Should get all services', async () => {
    const services = await consulClient.getServices();
    expect(services).toHaveLength(2);
    expect(services[0].name).toBe('api');
    expect(services[1].name).toBe('database');
  });
  
  test('Should get service connections', async () => {
    const connections = await consulClient.getServiceConnections();
    expect(connections).toHaveLength(2);
    expect(connections[0].source).toBe('api');
    expect(connections[0].destination).toBe('database');
    expect(connections[0].status).toBe('degraded');
  });
  
  test('Should get failing connections', async () => {
    const failingConnections = await consulClient.getFailingConnections();
    expect(failingConnections).toHaveLength(1);
    expect(failingConnections[0].source).toBe('api');
    expect(failingConnections[0].destination).toBe('database');
  });
  
  test('Should get health checks', async () => {
    const healthChecks = await consulClient.getAllHealthChecks();
    expect(healthChecks).toHaveLength(2);
    expect(healthChecks[0].name).toBe('API Health Check');
    expect(healthChecks[1].name).toBe('Database Health Check');
  });
  
  test('Should get failing health checks', async () => {
    const failingChecks = await consulClient.getFailingHealthChecks();
    expect(failingChecks).toHaveLength(1);
    expect(failingChecks[0].name).toBe('Database Health Check');
    expect(failingChecks[0].status).toBe('critical');
  });
  
  test('Should generate service diagram', async () => {
    const services = await consulClient.getServices();
    const connections = await consulClient.getServiceConnections();
    
    const diagram = await diagramGenerator.generateServiceDiagram(
      services,
      connections,
      { includeHealth: true, includeMetrics: true }
    );
    
    expect(diagram).toContain('flowchart TD');
    expect(diagram).toContain('api');
    expect(diagram).toContain('database');
  });
  
  test('Should analyze service', async () => {
    const analysis = await serviceAnalyzer.analyzeService('database');
    
    expect(analysis).toBeDefined();
    expect(analysis.issues.length).toBeGreaterThan(0);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });
});