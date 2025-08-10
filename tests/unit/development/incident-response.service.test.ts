import { IncidentResponseService } from '../../../src/modules/development/services/incident-response.service';
import { IncidentAlert, ResponsePlan, EscalationPolicy } from '../../../src/types';

describe('IncidentResponseService', () => {
  let service: IncidentResponseService;
  
  beforeEach(() => {
    service = new IncidentResponseService();
  });

  describe('createIncidentResponse', () => {
    it('should create comprehensive incident response for critical alert', async () => {
      const alert: IncidentAlert = {
        id: 'alert-001',
        severity: 'critical',
        service: 'lanka-api',
        title: 'Service Down - API Gateway',
        description: 'API Gateway is not responding, all requests failing',
        metrics: {
          errorRate: 1.0,
          responseTime: 0,
          availability: 0
        },
        timestamp: new Date('2024-01-15T10:30:00Z'),
        source: 'prometheus',
        tags: ['production', 'api-gateway', 'critical-path']
      };

      const response = await service.createIncidentResponse(alert);

      expect(response).toEqual({
        incident: expect.objectContaining({
          id: expect.stringMatching(/INC-\d{8}-\d{3}/),
          severity: 'critical',
          status: 'investigating',
          title: 'Service Down - API Gateway',
          createdAt: expect.any(Date),
          assignedTo: expect.any(String),
          escalationLevel: 1
        }),
        immediateActions: expect.arrayContaining([
          expect.objectContaining({
            action: 'health-check',
            description: 'Verify service health status',
            automated: true,
            command: expect.any(String)
          }),
          expect.objectContaining({
            action: 'traffic-reroute',
            description: 'Route traffic to backup instances',
            automated: false,
            priority: 'high'
          }),
          expect.objectContaining({
            action: 'stakeholder-notification',
            description: 'Notify critical stakeholders',
            automated: true
          })
        ]),
        diagnostics: expect.objectContaining({
          automated: expect.arrayContaining([
            expect.objectContaining({
              check: 'service-status',
              command: expect.any(String),
              expected: expect.any(String)
            }),
            expect.objectContaining({
              check: 'resource-usage',
              metrics: expect.any(Array)
            })
          ]),
          manual: expect.arrayContaining([
            'Check application logs for errors',
            'Verify database connectivity',
            'Review recent deployments'
          ])
        }),
        communication: expect.objectContaining({
          internal: expect.objectContaining({
            channels: expect.arrayContaining(['#incidents', '#engineering']),
            initialMessage: expect.any(String)
          }),
          external: expect.objectContaining({
            statusPage: expect.objectContaining({
              update: expect.any(String),
              impact: 'major'
            }),
            customers: expect.objectContaining({
              notify: true,
              message: expect.any(String)
            })
          })
        }),
        escalation: expect.objectContaining({
          level: 1,
          nextEscalation: expect.any(Date),
          policy: expect.any(Object)
        })
      });
    });

    it('should create appropriate response for warning alert', async () => {
      const alert: IncidentAlert = {
        id: 'alert-002',
        severity: 'warning',
        service: 'user-service',
        title: 'High Response Time',
        description: 'API response time above threshold',
        metrics: {
          responseTime: 1200,
          errorRate: 0.02
        },
        timestamp: new Date(),
        source: 'grafana'
      };

      const response = await service.createIncidentResponse(alert);

      expect(response.incident.severity).toBe('warning');
      expect(response.incident.escalationLevel).toBe(0);
      expect(response.immediateActions).not.toContainEqual(
        expect.objectContaining({ action: 'stakeholder-notification' })
      );
    });
  });

  describe('generateRunbook', () => {
    it('should generate comprehensive service runbook', async () => {
      const serviceConfig = {
        name: 'lanka-api',
        type: 'web-service',
        technology: 'node.js',
        dependencies: ['postgresql', 'redis', 'external-payment-api'],
        deployment: {
          platform: 'kubernetes',
          environment: 'production'
        },
        monitoring: {
          metrics: ['response_time', 'error_rate', 'throughput'],
          alerts: ['service_down', 'high_latency', 'database_errors']
        }
      };

      const runbook = await service.generateRunbook(serviceConfig);

      expect(runbook).toEqual({
        metadata: expect.objectContaining({
          service: 'lanka-api',
          version: expect.any(String),
          lastUpdated: expect.any(Date),
          maintainers: expect.any(Array)
        }),
        overview: expect.objectContaining({
          description: expect.any(String),
          architecture: expect.any(Object),
          dependencies: expect.any(Array),
          sla: expect.any(Object)
        }),
        commonIssues: expect.arrayContaining([
          expect.objectContaining({
            title: 'Service Not Responding',
            symptoms: expect.any(Array),
            causes: expect.any(Array),
            resolution: expect.objectContaining({
              steps: expect.any(Array),
              commands: expect.any(Array),
              verification: expect.any(String)
            }),
            preventiveMeasures: expect.any(Array)
          }),
          expect.objectContaining({
            title: 'High Response Time',
            symptoms: expect.arrayContaining([
              'API response time > 1000ms',
              'User complaints about slow performance'
            ]),
            causes: expect.arrayContaining([
              'Database query performance',
              'High CPU usage',
              'Memory leaks'
            ])
          })
        ]),
        diagnostics: expect.objectContaining({
          healthChecks: expect.arrayContaining([
            expect.objectContaining({
              name: 'service-health',
              endpoint: '/health',
              command: expect.any(String)
            })
          ]),
          logs: expect.objectContaining({
            application: expect.any(String),
            access: expect.any(String),
            error: expect.any(String)
          }),
          metrics: expect.objectContaining({
            dashboards: expect.any(Array),
            keyMetrics: expect.any(Array)
          })
        }),
        escalation: expect.objectContaining({
          levels: expect.arrayContaining([
            expect.objectContaining({
              level: 1,
              contacts: expect.any(Array),
              timeframe: expect.any(String)
            })
          ]),
          communication: expect.any(Object)
        }),
        recoveryProcedures: expect.objectContaining({
          restart: expect.objectContaining({
            kubernetes: expect.any(Array),
            docker: expect.any(Array)
          }),
          rollback: expect.objectContaining({
            steps: expect.any(Array),
            verification: expect.any(String)
          }),
          dataRecovery: expect.objectContaining({
            backup: expect.any(Object),
            restore: expect.any(Array)
          })
        })
      });
    });
  });

  describe('generateEscalationPolicy', () => {
    it('should create comprehensive escalation policy', async () => {
      const teamConfig = {
        name: 'Platform Engineering',
        timezone: 'UTC',
        oncall: {
          rotation: 'weekly',
          schedule: [
            { name: 'Alice Johnson', email: 'alice@company.com', phone: '+1234567890' },
            { name: 'Bob Smith', email: 'bob@company.com', phone: '+1234567891' }
          ]
        },
        escalationRules: {
          critical: { immediate: true, escalateAfter: '5m' },
          major: { immediate: false, escalateAfter: '15m' },
          minor: { immediate: false, escalateAfter: '1h' }
        }
      };

      const policy = await service.generateEscalationPolicy(teamConfig);

      expect(policy).toEqual({
        name: 'Platform Engineering Escalation Policy',
        levels: expect.arrayContaining([
          expect.objectContaining({
            level: 1,
            name: 'On-Call Engineer',
            contacts: expect.arrayContaining([
              expect.objectContaining({
                type: 'primary',
                method: 'phone',
                contact: expect.any(String)
              }),
              expect.objectContaining({
                type: 'primary',
                method: 'email',
                contact: expect.any(String)
              })
            ]),
            timeout: '5m'
          }),
          expect.objectContaining({
            level: 2,
            name: 'Engineering Manager',
            timeout: '10m'
          }),
          expect.objectContaining({
            level: 3,
            name: 'VP Engineering',
            timeout: '15m'
          })
        ]),
        rules: expect.arrayContaining([
          expect.objectContaining({
            severity: 'critical',
            escalationTime: '5m',
            notificationMethods: expect.arrayContaining(['phone', 'sms', 'email'])
          }),
          expect.objectContaining({
            severity: 'major',
            escalationTime: '15m',
            notificationMethods: expect.arrayContaining(['email', 'slack'])
          })
        ]),
        schedule: expect.objectContaining({
          rotation: 'weekly',
          timezone: 'UTC',
          calendar: expect.any(Array)
        }),
        overrides: expect.objectContaining({
          holidays: expect.any(Array),
          maintenance: expect.any(Array)
        })
      });
    });
  });

  describe('automateIncidentMitigation', () => {
    it('should execute automated mitigation for service down incident', async () => {
      const incident = {
        id: 'INC-20240115-001',
        type: 'service-down',
        service: 'payment-api',
        severity: 'critical',
        cause: 'high-memory-usage'
      };

      const mitigation = await service.automateIncidentMitigation(incident);

      expect(mitigation).toEqual({
        actions: expect.arrayContaining([
          expect.objectContaining({
            type: 'auto-scaling',
            description: 'Scale up service instances',
            command: 'kubectl scale deployment payment-api --replicas=5',
            status: 'executed',
            result: expect.any(Object)
          }),
          expect.objectContaining({
            type: 'circuit-breaker',
            description: 'Enable circuit breaker for external dependencies',
            status: 'executed'
          }),
          expect.objectContaining({
            type: 'cache-flush',
            description: 'Clear application cache to free memory',
            status: 'executed'
          })
        ]),
        verification: expect.objectContaining({
          healthCheck: expect.objectContaining({
            status: 'passing',
            metrics: expect.any(Object)
          }),
          monitoring: expect.objectContaining({
            alerts: expect.any(Array),
            metrics: expect.any(Object)
          })
        }),
        fallback: expect.objectContaining({
          required: expect.any(Boolean),
          actions: expect.any(Array)
        }),
        timeline: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(Date),
            action: expect.any(String),
            status: expect.any(String)
          })
        ])
      });
    });

    it('should handle database performance incident', async () => {
      const incident = {
        id: 'INC-20240115-002',
        type: 'database-performance',
        service: 'user-service',
        severity: 'major',
        cause: 'slow-queries'
      };

      const mitigation = await service.automateIncidentMitigation(incident);

      expect(mitigation.actions).toContainEqual(
        expect.objectContaining({
          type: 'query-optimization',
          description: expect.any(String)
        })
      );
      expect(mitigation.actions).toContainEqual(
        expect.objectContaining({
          type: 'connection-pool-adjustment',
          description: expect.any(String)
        })
      );
    });
  });

  describe('generatePostmortem', () => {
    it('should generate comprehensive postmortem report', async () => {
      const incidentData = {
        incident: {
          id: 'INC-20240115-001',
          title: 'API Gateway Outage',
          severity: 'critical',
          duration: '45 minutes',
          impact: 'All API requests failed',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T10:45:00Z')
        },
        timeline: [
          { time: '10:00', event: 'First alert triggered' },
          { time: '10:05', event: 'On-call engineer notified' },
          { time: '10:15', event: 'Root cause identified - memory leak' },
          { time: '10:30', event: 'Service restarted' },
          { time: '10:45', event: 'Full service restored' }
        ],
        rootCause: {
          category: 'software-bug',
          description: 'Memory leak in connection pool management',
          introduced: '2024-01-10 deployment'
        },
        impact: {
          users: 15000,
          revenue: 25000,
          duration: '45 minutes'
        }
      };

      const postmortem = await service.generatePostmortem(incidentData);

      expect(postmortem).toEqual({
        metadata: expect.objectContaining({
          incidentId: 'INC-20240115-001',
          date: expect.any(Date),
          author: expect.any(String),
          reviewers: expect.any(Array)
        }),
        summary: expect.objectContaining({
          title: 'API Gateway Outage',
          duration: '45 minutes',
          impact: expect.objectContaining({
            severity: 'critical',
            usersAffected: 15000,
            revenueImpact: 25000
          }),
          rootCause: expect.stringContaining('Memory leak')
        }),
        timeline: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            event: expect.any(String),
            type: expect.stringMatching(/detection|investigation|mitigation|resolution/)
          })
        ]),
        rootCauseAnalysis: expect.objectContaining({
          primaryCause: expect.any(String),
          contributingFactors: expect.any(Array),
          whyAnalysis: expect.arrayContaining([
            expect.objectContaining({
              level: 1,
              question: 'Why did the API gateway fail?',
              answer: expect.any(String)
            })
          ])
        }),
        actionItems: expect.arrayContaining([
          expect.objectContaining({
            type: 'immediate',
            description: expect.any(String),
            assignee: expect.any(String),
            dueDate: expect.any(Date)
          }),
          expect.objectContaining({
            type: 'preventive',
            description: expect.any(String)
          })
        ]),
        lessonsLearned: expect.objectContaining({
          whatWentWell: expect.any(Array),
          whatWentPoorly: expect.any(Array),
          improvements: expect.any(Array)
        }),
        followUp: expect.objectContaining({
          monitoring: expect.any(Array),
          processes: expect.any(Array),
          training: expect.any(Array)
        })
      });
    });
  });

  describe('integrateWithAlerting', () => {
    it('should integrate incident response with alerting systems', async () => {
      const alertConfig = {
        systems: ['prometheus', 'grafana', 'datadog'],
        webhooks: ['slack', 'pagerduty'],
        routing: {
          critical: 'immediate-response',
          major: 'escalated-response',
          minor: 'standard-response'
        }
      };

      const integration = await service.integrateWithAlerting(alertConfig);

      expect(integration).toEqual({
        webhookEndpoints: expect.arrayContaining([
          expect.objectContaining({
            system: 'prometheus',
            endpoint: expect.stringMatching(/\/api\/webhooks\/prometheus/),
            authentication: expect.any(Object)
          }),
          expect.objectContaining({
            system: 'grafana',
            endpoint: expect.stringMatching(/\/api\/webhooks\/grafana/)
          })
        ]),
        routingRules: expect.arrayContaining([
          expect.objectContaining({
            condition: expect.objectContaining({
              severity: 'critical'
            }),
            action: expect.objectContaining({
              type: 'create-incident',
              escalate: true,
              notify: expect.any(Array)
            })
          })
        ]),
        templates: expect.objectContaining({
          slack: expect.objectContaining({
            critical: expect.any(String),
            resolved: expect.any(String)
          }),
          email: expect.objectContaining({
            incident: expect.any(String),
            summary: expect.any(String)
          })
        }),
        automation: expect.objectContaining({
          scripts: expect.any(Array),
          workflows: expect.any(Array)
        })
      });
    });
  });
});