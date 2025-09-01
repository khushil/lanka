/**
 * LANKA Memory System - Audit Service
 * Maintains comprehensive audit trails for all memory operations
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MemoryArbitrationResult,
  ArbitrationAudit,
  Memory,
  MemorySystemConfig,
} from '../types/memory.types';

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'arbitration' | 'evolution' | 'access' | 'merge' | 'deprecation' | 'quality_check';
  memoryId: string;
  userId?: string;
  sessionId?: string;
  workspace: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'warning';
  duration?: number; // milliseconds
  metadata: {
    version: number;
    correlationId?: string;
    parentEventId?: string;
    tags: string[];
  };
}

interface AuditQuery {
  memoryId?: string;
  workspace?: string;
  eventType?: AuditEvent['eventType'][];
  outcome?: AuditEvent['outcome'][];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  averageDuration: number;
  recentActivity: number;
  topWorkspaces: Array<{ workspace: string; count: number }>;
  errorRate: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditBuffer: AuditEvent[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor(private readonly config: MemorySystemConfig) {
    this.initializeAuditService();
  }

  /**
   * Log memory arbitration events
   */
  async logArbitration(result: MemoryArbitrationResult): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'arbitration',
        memoryId: result.auditTrail.arbitrationId, // Using arbitration ID as identifier
        workspace: this.extractWorkspaceFromAudit(result.auditTrail),
        details: {
          decision: result.decision,
          confidence: result.confidence,
          reasoning: result.reasoning,
          targetMemoryId: result.targetMemoryId,
          mergeStrategy: result.mergeStrategy,
          reviewRequired: result.auditTrail.reviewRequired,
          qualityScore: result.auditTrail.qualityAssessment.overall,
          riskScore: result.auditTrail.riskAssessment.overall,
          similarMemoriesCount: result.auditTrail.similarMemories.length,
        },
        outcome: result.decision === 'REJECT' ? 'failure' : 'success',
        metadata: {
          version: 1,
          correlationId: result.auditTrail.arbitrationId,
          tags: ['arbitration', result.decision.toLowerCase()],
        },
      };

      await this.bufferAuditEvent(auditEvent);
      this.logger.debug(`Arbitration audit logged: ${result.decision} for ${result.auditTrail.arbitrationId}`);
    } catch (error) {
      this.logger.error(`Failed to log arbitration audit: ${error.message}`, error.stack);
    }
  }

  /**
   * Log memory evolution events
   */
  async logEvolution(
    memoryId: string,
    workspace: string,
    evolutionType: 'strength_update' | 'contradiction_resolution' | 'merge' | 'deprecation',
    details: Record<string, any>,
    outcome: 'success' | 'failure' | 'warning' = 'success',
    duration?: number,
  ): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'evolution',
        memoryId,
        workspace,
        details: {
          evolutionType,
          ...details,
        },
        outcome,
        duration,
        metadata: {
          version: 1,
          tags: ['evolution', evolutionType],
        },
      };

      await this.bufferAuditEvent(auditEvent);
      this.logger.debug(`Evolution audit logged: ${evolutionType} for ${memoryId}`);
    } catch (error) {
      this.logger.error(`Failed to log evolution audit: ${error.message}`, error.stack);
    }
  }

  /**
   * Log memory access events
   */
  async logAccess(
    memoryId: string,
    workspace: string,
    accessType: 'search' | 'retrieve' | 'reference',
    userId?: string,
    sessionId?: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'access',
        memoryId,
        userId,
        sessionId,
        workspace,
        details: {
          accessType,
          context: context || {},
        },
        outcome: 'success',
        metadata: {
          version: 1,
          tags: ['access', accessType],
        },
      };

      await this.bufferAuditEvent(auditEvent);
    } catch (error) {
      this.logger.error(`Failed to log access audit: ${error.message}`, error.stack);
    }
  }

  /**
   * Log quality check events
   */
  async logQualityCheck(
    memoryId: string,
    workspace: string,
    qualityScore: number,
    gateResults: Array<{ gate: string; passed: boolean; score: number }>,
    suggestions: string[] = [],
  ): Promise<void> {
    try {
      const outcome = gateResults.every(g => g.passed) ? 'success' : 'warning';
      
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'quality_check',
        memoryId,
        workspace,
        details: {
          overallScore: qualityScore,
          gateResults,
          suggestions,
          passedGates: gateResults.filter(g => g.passed).length,
          totalGates: gateResults.length,
        },
        outcome,
        metadata: {
          version: 1,
          tags: ['quality_check', outcome],
        },
      };

      await this.bufferAuditEvent(auditEvent);
      this.logger.debug(`Quality check audit logged for ${memoryId}: ${qualityScore.toFixed(3)}`);
    } catch (error) {
      this.logger.error(`Failed to log quality check audit: ${error.message}`, error.stack);
    }
  }

  /**
   * Query audit events
   */
  async queryAuditEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Querying audit events: ${JSON.stringify(query)}`);

      // Ensure buffer is flushed before querying
      await this.flushBuffer();

      const events = await this.executeAuditQuery(query);
      const totalCount = await this.getAuditEventCount(query);
      const hasMore = (query.offset || 0) + events.length < totalCount;

      this.logger.debug(`Audit query returned ${events.length} events (${totalCount} total)`);

      return {
        events,
        totalCount,
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Audit query failed: ${error.message}`, error.stack);
      throw new Error(`Audit query failed: ${error.message}`);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    workspace?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditStatistics> {
    try {
      await this.flushBuffer();

      const stats = await this.calculateAuditStatistics({
        workspace,
        startDate,
        endDate,
      });

      this.logger.debug(`Generated audit statistics for ${workspace || 'all workspaces'}`);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to generate audit statistics: ${error.message}`, error.stack);
      throw new Error(`Audit statistics failed: ${error.message}`);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    workspace: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: {
      totalOperations: number;
      successRate: number;
      auditCoverage: number;
      qualityGateCompliance: number;
    };
    details: {
      arbitrationDecisions: Record<string, number>;
      qualityTrends: Array<{ date: string; avgQuality: number }>;
      riskAssessments: Array<{ level: string; count: number }>;
      evolutionActivities: Record<string, number>;
    };
    recommendations: string[];
  }> {
    try {
      this.logger.log(`Generating compliance report for ${workspace} (${startDate.toISOString()} - ${endDate.toISOString()})`);

      const events = await this.executeAuditQuery({
        workspace,
        startDate,
        endDate,
        limit: 10000, // Large limit for comprehensive report
      });

      const report = await this.buildComplianceReport(events, workspace, startDate, endDate);
      
      this.logger.log(`Compliance report generated: ${report.summary.totalOperations} operations analyzed`);
      return report;
    } catch (error) {
      this.logger.error(`Compliance report generation failed: ${error.message}`, error.stack);
      throw new Error(`Compliance report failed: ${error.message}`);
    }
  }

  /**
   * Clean up old audit events
   */
  async cleanupOldAuditEvents(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const deletedCount = await this.deleteAuditEventsBefore(cutoffDate);
      
      this.logger.log(`Cleaned up ${deletedCount} audit events older than ${retentionDays} days`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Audit cleanup failed: ${error.message}`, error.stack);
      throw new Error(`Audit cleanup failed: ${error.message}`);
    }
  }

  /**
   * Health check for audit service
   */
  async healthCheck(): Promise<void> {
    try {
      // Test audit event creation and retrieval
      const testEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'access',
        memoryId: 'health_check_test',
        workspace: 'system',
        details: { test: true },
        outcome: 'success',
        metadata: {
          version: 1,
          tags: ['health_check'],
        },
      };

      await this.bufferAuditEvent(testEvent);
      await this.flushBuffer();

      // Try to retrieve the test event
      const query = await this.queryAuditEvents({
        memoryId: 'health_check_test',
        limit: 1,
      });

      if (query.events.length === 0) {
        throw new Error('Test audit event not found');
      }

      // Clean up test event
      await this.deleteAuditEvent(testEvent.id);

      this.logger.debug('Audit service health check passed');
    } catch (error) {
      this.logger.error('Audit service health check failed', error.stack);
      throw error;
    }
  }

  // Private implementation methods

  private initializeAuditService(): void {
    this.logger.log('Initializing Audit Service');

    // Set up periodic buffer flushing
    setInterval(() => {
      this.flushBuffer().catch(error => {
        this.logger.error(`Buffer flush failed: ${error.message}`);
      });
    }, this.FLUSH_INTERVAL);

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupOldAuditEvents().catch(error => {
        this.logger.error(`Periodic cleanup failed: ${error.message}`);
      });
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async bufferAuditEvent(event: AuditEvent): Promise<void> {
    this.auditBuffer.push(event);

    if (this.auditBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return;

    const eventsToFlush = this.auditBuffer.splice(0, this.auditBuffer.length);
    
    try {
      await this.persistAuditEvents(eventsToFlush);
      this.logger.debug(`Flushed ${eventsToFlush.length} audit events to storage`);
    } catch (error) {
      // Put events back in buffer for retry
      this.auditBuffer.unshift(...eventsToFlush);
      throw error;
    }
  }

  private async persistAuditEvents(events: AuditEvent[]): Promise<void> {
    // This would persist events to the audit database
    // Implementation depends on storage backend (PostgreSQL, MongoDB, etc.)
    
    try {
      // Placeholder for actual persistence logic
      for (const event of events) {
        await this.saveAuditEvent(event);
      }
    } catch (error) {
      this.logger.error(`Failed to persist audit events: ${error.message}`);
      throw error;
    }
  }

  private async saveAuditEvent(event: AuditEvent): Promise<void> {
    // Placeholder for database insertion
    // Would use the configured database client (PostgreSQL, etc.)
  }

  private async executeAuditQuery(query: AuditQuery): Promise<AuditEvent[]> {
    // Placeholder for actual database query
    // Would build and execute SQL/NoSQL query based on parameters
    
    // Mock implementation
    return [];
  }

  private async getAuditEventCount(query: AuditQuery): Promise<number> {
    // Placeholder for count query
    return 0;
  }

  private async calculateAuditStatistics(query: {
    workspace?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditStatistics> {
    // Placeholder for statistics calculation
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByOutcome: {},
      averageDuration: 0,
      recentActivity: 0,
      topWorkspaces: [],
      errorRate: 0,
    };
  }

  private async buildComplianceReport(
    events: AuditEvent[],
    workspace: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const summary = {
      totalOperations: events.length,
      successRate: events.filter(e => e.outcome === 'success').length / events.length,
      auditCoverage: 1.0, // Assuming 100% coverage
      qualityGateCompliance: this.calculateQualityCompliance(events),
    };

    const arbitrationEvents = events.filter(e => e.eventType === 'arbitration');
    const qualityEvents = events.filter(e => e.eventType === 'quality_check');
    const evolutionEvents = events.filter(e => e.eventType === 'evolution');

    const details = {
      arbitrationDecisions: this.countByProperty(arbitrationEvents, 'details.decision'),
      qualityTrends: this.calculateQualityTrends(qualityEvents),
      riskAssessments: this.analyzeRiskDistribution(arbitrationEvents),
      evolutionActivities: this.countByProperty(evolutionEvents, 'details.evolutionType'),
    };

    const recommendations = this.generateComplianceRecommendations(summary, details);

    return {
      summary,
      details,
      recommendations,
    };
  }

  private calculateQualityCompliance(events: AuditEvent[]): number {
    const qualityEvents = events.filter(e => e.eventType === 'quality_check');
    if (qualityEvents.length === 0) return 1.0;
    
    const passedEvents = qualityEvents.filter(e => e.outcome === 'success');
    return passedEvents.length / qualityEvents.length;
  }

  private countByProperty(events: AuditEvent[], property: string): Record<string, number> {
    const counts: Record<string, number> = {};
    
    events.forEach(event => {
      const value = this.getNestedProperty(event, property);
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return counts;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private calculateQualityTrends(events: AuditEvent[]): Array<{ date: string; avgQuality: number }> {
    // Group events by date and calculate average quality
    const dailyQuality: Record<string, { sum: number; count: number }> = {};
    
    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      const quality = event.details.overallScore;
      
      if (!dailyQuality[date]) {
        dailyQuality[date] = { sum: 0, count: 0 };
      }
      
      dailyQuality[date].sum += quality;
      dailyQuality[date].count++;
    });
    
    return Object.entries(dailyQuality).map(([date, stats]) => ({
      date,
      avgQuality: stats.sum / stats.count,
    }));
  }

  private analyzeRiskDistribution(events: AuditEvent[]): Array<{ level: string; count: number }> {
    const riskLevels = { low: 0, medium: 0, high: 0 };
    
    events.forEach(event => {
      const riskScore = event.details.riskScore || 0;
      if (riskScore < 0.3) riskLevels.low++;
      else if (riskScore < 0.7) riskLevels.medium++;
      else riskLevels.high++;
    });
    
    return Object.entries(riskLevels).map(([level, count]) => ({ level, count }));
  }

  private generateComplianceRecommendations(summary: any, details: any): string[] {
    const recommendations: string[] = [];
    
    if (summary.successRate < 0.9) {
      recommendations.push('Consider reviewing arbitration criteria - success rate below 90%');
    }
    
    if (summary.qualityGateCompliance < 0.8) {
      recommendations.push('Quality gate compliance below 80% - review quality standards');
    }
    
    if (details.riskAssessments.find((r: any) => r.level === 'high')?.count > 0) {
      recommendations.push('High-risk operations detected - consider additional safeguards');
    }
    
    return recommendations;
  }

  private async deleteAuditEventsBefore(cutoffDate: Date): Promise<number> {
    // Placeholder for deletion logic
    return 0;
  }

  private async deleteAuditEvent(eventId: string): Promise<void> {
    // Placeholder for single event deletion
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractWorkspaceFromAudit(audit: ArbitrationAudit): string {
    // Extract workspace information from audit trail
    // This would depend on the audit structure
    return 'unknown';
  }
}