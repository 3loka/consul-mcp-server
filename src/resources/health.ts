// src/resources/health.ts
import { ConsulClient, HealthCheck, HealthStatus } from './consul-client.js';

/**
 * HealthManager provides operations for analyzing Consul health checks
 */
export class HealthManager {
  private consulClient: ConsulClient;

  constructor(consulClient: ConsulClient) {
    this.consulClient = consulClient;
  }

  async getAllHealthChecks(): Promise<EnrichedHealthCheck[]> {
    const checks = await this.consulClient.getAllHealthChecks();
    return checks.map(check => this.enrichHealthCheck(check));
  }

  async getFailingHealthChecks(): Promise<EnrichedHealthCheck[]> {
    const checks = await this.consulClient.getFailingHealthChecks();
    return checks.map(check => this.enrichHealthCheck(check));
  }

  async getHealthSummary(): Promise<HealthSummary> {
    const allChecks = await this.consulClient.getAllHealthChecks();

    const passingCount = allChecks.filter(check => check.status === 'passing').length;
    const warningCount = allChecks.filter(check => check.status === 'warning').length;
    const criticalCount = allChecks.filter(check => check.status === 'critical').length;
    const unknownCount = allChecks.filter(check => check.status === 'unknown').length;

    const failingChecksMap = new Map<string, number>();
    for (const check of allChecks) {
      if ((check.status === 'warning' || check.status === 'critical') && check.serviceName) {
        const current = failingChecksMap.get(check.serviceName) || 0;
        failingChecksMap.set(check.serviceName, current + 1);
      }
    }

    const failingChecksByService = Array.from(failingChecksMap.entries())
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count);

    let overallStatus: HealthStatus = 'passing';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    return {
      total: allChecks.length,
      passing: passingCount,
      warning: warningCount,
      critical: criticalCount,
      unknown: unknownCount,
      failingChecksByService,
      overallStatus
    };
  }

  async analyzeHealthIssues(): Promise<HealthAnalysis> {
    const failingChecks = await this.consulClient.getFailingHealthChecks();
    const analysis: HealthAnalysis = {
      patterns: [],
      recommendations: []
    };

    const timeoutChecks = failingChecks.filter(check =>
      check.output.toLowerCase().includes('timeout')
    );
    if (timeoutChecks.length > 0) {
      analysis.patterns.push({
        type: 'timeout',
        count: timeoutChecks.length,
        affectedServices: [...new Set(timeoutChecks.map(c => c.serviceName).filter((s): s is string => Boolean(s)))]
      });
      analysis.recommendations.push(
        'Several services are experiencing timeouts. Consider checking network connectivity and service response times.'
      );
    }

    const connectionRefusedChecks = failingChecks.filter(check =>
      check.output.toLowerCase().includes('connection refused') ||
      check.output.toLowerCase().includes('connect')
    );
    if (connectionRefusedChecks.length > 0) {
      analysis.patterns.push({
        type: 'connection_refused',
        count: connectionRefusedChecks.length,
        affectedServices: [...new Set(connectionRefusedChecks.map(c => c.serviceName).filter((s): s is string => Boolean(s)))]
      });
      analysis.recommendations.push(
        'Connection refused errors detected. Verify that all services are running and accepting connections.'
      );
    }

    const diskSpaceChecks = failingChecks.filter(check =>
      check.output.toLowerCase().includes('disk') || check.output.toLowerCase().includes('storage')
    );
    if (diskSpaceChecks.length > 0) {
      analysis.patterns.push({
        type: 'disk_space',
        count: diskSpaceChecks.length,
        affectedServices: [...new Set(diskSpaceChecks.map(c => c.serviceName).filter((s): s is string => Boolean(s)))]
      });
      analysis.recommendations.push(
        'Disk space issues detected. Consider cleaning up logs or adding more storage.'
      );
    }

    const httpErrorChecks = failingChecks.filter(check =>
      /HTTP.*[45]\d\d/.test(check.output)
    );
    if (httpErrorChecks.length > 0) {
      analysis.patterns.push({
        type: 'http_error',
        count: httpErrorChecks.length,
        affectedServices: [...new Set(httpErrorChecks.map(c => c.serviceName).filter((s): s is string => Boolean(s)))]
      });
      analysis.recommendations.push(
        'HTTP errors detected. Review service logs for error details and check for recent deployments or configuration changes.'
      );
    }

    if (analysis.patterns.length === 0 && failingChecks.length > 0) {
      analysis.patterns.push({
        type: 'miscellaneous',
        count: failingChecks.length,
        affectedServices: [...new Set(failingChecks.map(c => c.serviceName).filter((s): s is string => Boolean(s)))]
      });
      analysis.recommendations.push(
        'Investigate each failing service individually to determine the cause of health check failures.'
      );
    }

    return analysis;
  }

  private enrichHealthCheck(check: HealthCheck): EnrichedHealthCheck {
    const possibleIssues: string[] = [];
    const remediation: string[] = [];

    if (check.status === 'critical') {
      possibleIssues.push('Service may be down or unreachable');
      remediation.push('Check if the service is running');
      remediation.push('Verify network connectivity to the service');
    } else if (check.status === 'warning') {
      possibleIssues.push('Service is degraded but still functional');
      remediation.push('Monitor the service for further degradation');
    }

    const output = check.output?.toLowerCase() || '';

    if (output.includes('timeout')) {
      possibleIssues.push('Request timeout');
      remediation.push('Check if the service is overloaded');
      remediation.push('Consider increasing the timeout threshold');
    }

    if (output.includes('connection refused')) {
      possibleIssues.push('Service is not accepting connections');
      remediation.push('Ensure the service is running');
      remediation.push('Check if firewall rules are blocking connections');
    }

    if (output.includes('disk') || output.includes('storage')) {
      possibleIssues.push('Disk space or storage issue');
      remediation.push('Clean up logs or temporary files');
      remediation.push('Add additional storage if needed');
    }

    if (/HTTP.*[45]\d\d/.test(output)) {
      const statusCode = output.match(/HTTP.*([45]\d\d)/)?.[1];
      possibleIssues.push(`HTTP ${statusCode} error`);
      if (statusCode?.startsWith('4')) {
        remediation.push('Check service configuration and request parameters');
      } else if (statusCode?.startsWith('5')) {
        remediation.push('Check service logs for internal errors');
        remediation.push('Verify that dependencies are available');
      }
    }

    return {
      ...check,
      analysis: {
        possibleIssues: possibleIssues.length > 0 ? possibleIssues : ['Unknown issue'],
        remediation: remediation.length > 0 ? remediation : ['Investigate service logs'],
        severity: check.status === 'critical' ? 'high' :
                  check.status === 'warning' ? 'medium' : 'low'
      }
    };
  }
}

// Type definitions

export interface EnrichedHealthCheck extends HealthCheck {
  analysis: {
    possibleIssues: string[];
    remediation: string[];
    severity: 'high' | 'medium' | 'low';
  };
}

export interface HealthSummary {
  total: number;
  passing: number;
  warning: number;
  critical: number;
  unknown: number;
  failingChecksByService: Array<{
    serviceName: string;
    count: number;
  }>;
  overallStatus: HealthStatus;
}

export interface HealthAnalysis {
  patterns: Array<{
    type: string;
    count: number;
    affectedServices: string[];
  }>;
  recommendations: string[];
}