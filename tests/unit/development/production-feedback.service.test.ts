import { ProductionFeedbackService } from '../../../src/modules/development/services/production-feedback.service';
import { ProductionMetrics, FeedbackLoop, PerformanceInsights } from '../../../src/types';

describe('ProductionFeedbackService', () => {
  let service: ProductionFeedbackService;
  
  beforeEach(() => {
    service = new ProductionFeedbackService();
  });

  describe('collectProductionMetrics', () => {
    it('should collect comprehensive production metrics', async () => {
      const metricsConfig = {
        timeRange: '24h',
        services: ['lanka-api', 'user-service', 'payment-service'],
        metrics: ['performance', 'reliability', 'business'],
        granularity: '5m'
      };

      const metrics = await service.collectProductionMetrics(metricsConfig);

      expect(metrics).toEqual({
        timeRange: {
          start: expect.any(Date),
          end: expect.any(Date),
          granularity: '5m'
        },
        services: expect.objectContaining({
          'lanka-api': expect.objectContaining({
            performance: expect.objectContaining({
              responseTime: expect.objectContaining({
                p50: expect.any(Number),
                p95: expect.any(Number),
                p99: expect.any(Number),
                avg: expect.any(Number)
              }),
              throughput: expect.objectContaining({
                requestsPerSecond: expect.any(Number),
                totalRequests: expect.any(Number)
              }),
              errorRate: expect.objectContaining({
                percentage: expect.any(Number),
                totalErrors: expect.any(Number)
              })
            }),
            reliability: expect.objectContaining({
              uptime: expect.any(Number),
              availability: expect.any(Number),
              mtbf: expect.any(Number),
              mttr: expect.any(Number)
            }),
            resources: expect.objectContaining({
              cpu: expect.objectContaining({
                avg: expect.any(Number),
                max: expect.any(Number)
              }),
              memory: expect.objectContaining({
                avg: expect.any(Number),
                max: expect.any(Number)
              })
            })
          })
        }),
        business: expect.objectContaining({
          userEngagement: expect.objectContaining({
            activeUsers: expect.any(Number),
            sessionDuration: expect.any(Number),
            bounceRate: expect.any(Number)
          }),
          transactions: expect.objectContaining({
            completed: expect.any(Number),
            failed: expect.any(Number),
            revenue: expect.any(Number)
          }),
          features: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              usage: expect.any(Number),
              performance: expect.any(Number)
            })
          ])
        }),
        alerts: expect.arrayContaining([
          expect.objectContaining({
            service: expect.any(String),
            metric: expect.any(String),
            severity: expect.stringMatching(/info|warning|critical/),
            value: expect.any(Number),
            threshold: expect.any(Number)
          })
        ])
      });
    });

    it('should handle different time ranges', async () => {
      const configs = [
        { timeRange: '1h', granularity: '1m' },
        { timeRange: '7d', granularity: '1h' },
        { timeRange: '30d', granularity: '6h' }
      ];

      for (const config of configs) {
        const metrics = await service.collectProductionMetrics({
          ...config,
          services: ['test-service'],
          metrics: ['performance']
        });

        expect(metrics.timeRange.granularity).toBe(config.granularity);
      }
    });
  });

  describe('generateFeedbackLoop', () => {
    it('should generate development feedback from production metrics', async () => {
      const productionData: ProductionMetrics = {
        performance: {
          responseTime: { p95: 1200, p99: 2500 },
          errorRate: { percentage: 2.5 },
          throughput: { requestsPerSecond: 150 }
        },
        features: [
          { name: 'user-registration', usage: 85, performance: 800 },
          { name: 'payment-processing', usage: 45, performance: 1500 }
        ],
        issues: [
          {
            type: 'performance',
            severity: 'high',
            description: 'Database query optimization needed',
            frequency: 15,
            impact: 'user-experience'
          },
          {
            type: 'reliability',
            severity: 'medium',
            description: 'Intermittent cache failures',
            frequency: 8,
            impact: 'performance'
          }
        ]
      };

      const feedbackLoop = await service.generateFeedbackLoop(productionData);

      expect(feedbackLoop).toEqual({
        insights: expect.arrayContaining([
          expect.objectContaining({
            category: 'performance',
            priority: 'high',
            title: 'Response Time Optimization Required',
            description: expect.stringContaining('95th percentile'),
            metrics: expect.objectContaining({
              current: 1200,
              target: expect.any(Number),
              impact: 'high'
            }),
            recommendations: expect.arrayContaining([
              expect.objectContaining({
                action: 'optimize-database-queries',
                description: expect.any(String),
                effort: expect.stringMatching(/low|medium|high/),
                impact: expect.stringMatching(/low|medium|high/)
              })
            ])
          })
        ]),
        developmentActions: expect.arrayContaining([
          expect.objectContaining({
            type: 'bug-fix',
            priority: 'high',
            title: expect.any(String),
            description: expect.any(String),
            assignee: expect.any(String),
            sprint: expect.any(String),
            estimatedEffort: expect.any(String)
          }),
          expect.objectContaining({
            type: 'feature-improvement',
            priority: 'medium',
            component: expect.any(String)
          })
        ]),
        monitoring: expect.objectContaining({
          newMetrics: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              description: expect.any(String),
              threshold: expect.any(Number)
            })
          ]),
          alerts: expect.arrayContaining([
            expect.objectContaining({
              condition: expect.any(String),
              severity: expect.any(String)
            })
          ])
        }),
        testing: expect.objectContaining({
          scenarios: expect.arrayContaining([
            expect.objectContaining({
              type: 'performance',
              description: expect.any(String),
              criteria: expect.any(Object)
            })
          ]),
          automation: expect.arrayContaining([
            expect.objectContaining({
              test: expect.any(String),
              frequency: expect.any(String)
            })
          ])
        })
      });
    });
  });

  describe('analyzeUserBehavior', () => {
    it('should analyze user behavior patterns from production data', async () => {
      const behaviorData = {
        timeRange: '7d',
        userSessions: [
          {
            userId: 'user1',
            sessionDuration: 1200,
            pagesVisited: 8,
            actionsPerformed: ['login', 'search', 'purchase'],
            errors: []
          },
          {
            userId: 'user2',
            sessionDuration: 300,
            pagesVisited: 2,
            actionsPerformed: ['login', 'search'],
            errors: ['timeout-error']
          }
        ],
        features: [
          { name: 'search', usage: 2500, completionRate: 0.85 },
          { name: 'checkout', usage: 800, completionRate: 0.72 }
        ]
      };

      const analysis = await service.analyzeUserBehavior(behaviorData);

      expect(analysis).toEqual({
        patterns: expect.arrayContaining([
          expect.objectContaining({
            pattern: 'high-bounce-rate',
            description: expect.any(String),
            frequency: expect.any(Number),
            impact: expect.stringMatching(/low|medium|high/)
          }),
          expect.objectContaining({
            pattern: 'feature-abandonment',
            feature: 'checkout',
            completionRate: 0.72,
            recommendations: expect.any(Array)
          })
        ]),
        userSegments: expect.arrayContaining([
          expect.objectContaining({
            segment: 'power-users',
            characteristics: expect.any(Array),
            size: expect.any(Number),
            behavior: expect.any(Object)
          }),
          expect.objectContaining({
            segment: 'casual-users',
            characteristics: expect.any(Array)
          })
        ]),
        painPoints: expect.arrayContaining([
          expect.objectContaining({
            issue: expect.any(String),
            severity: expect.stringMatching(/low|medium|high/),
            affectedUsers: expect.any(Number),
            solutions: expect.any(Array)
          })
        ]),
        opportunities: expect.arrayContaining([
          expect.objectContaining({
            type: 'feature-enhancement',
            description: expect.any(String),
            expectedImpact: expect.any(String)
          })
        ]),
        recommendations: expect.objectContaining({
          ui: expect.any(Array),
          ux: expect.any(Array),
          performance: expect.any(Array),
          features: expect.any(Array)
        })
      });
    });
  });

  describe('generatePerformanceInsights', () => {
    it('should generate actionable performance insights', async () => {
      const performanceData = {
        services: {
          'api-gateway': {
            responseTime: { p50: 200, p95: 800, p99: 1500 },
            errorRate: 0.015,
            throughput: 500,
            resources: { cpu: 65, memory: 78 }
          },
          'database': {
            queryTime: { p50: 50, p95: 200, p99: 500 },
            connectionPool: { active: 15, max: 20 },
            slowQueries: 12
          }
        },
        infrastructure: {
          kubernetes: {
            podRestarts: 8,
            resourceUtilization: { cpu: 70, memory: 85 }
          },
          network: {
            latency: { avg: 15, max: 45 },
            bandwidth: { utilization: 60 }
          }
        }
      };

      const insights = await service.generatePerformanceInsights(performanceData);

      expect(insights).toEqual({
        summary: expect.objectContaining({
          overallHealth: expect.stringMatching(/excellent|good|fair|poor/),
          criticalIssues: expect.any(Number),
          warnings: expect.any(Number),
          recommendations: expect.any(Number)
        }),
        bottlenecks: expect.arrayContaining([
          expect.objectContaining({
            component: expect.any(String),
            type: expect.stringMatching(/cpu|memory|network|database/),
            severity: expect.stringMatching(/low|medium|high|critical/),
            impact: expect.any(String),
            solution: expect.objectContaining({
              immediate: expect.any(Array),
              longTerm: expect.any(Array)
            })
          })
        ]),
        optimizations: expect.arrayContaining([
          expect.objectContaining({
            category: expect.stringMatching(/performance|cost|reliability/),
            description: expect.any(String),
            expectedImprovement: expect.any(String),
            implementation: expect.objectContaining({
              effort: expect.stringMatching(/low|medium|high/),
              timeline: expect.any(String),
              steps: expect.any(Array)
            })
          })
        ]),
        trends: expect.objectContaining({
          performance: expect.objectContaining({
            direction: expect.stringMatching(/improving|stable|degrading/),
            changeRate: expect.any(Number)
          }),
          usage: expect.objectContaining({
            growth: expect.any(Number),
            forecast: expect.any(Array)
          })
        }),
        alerts: expect.arrayContaining([
          expect.objectContaining({
            metric: expect.any(String),
            threshold: expect.any(Number),
            current: expect.any(Number),
            severity: expect.any(String)
          })
        ])
      });
    });
  });

  describe('createDevelopmentTickets', () => {
    it('should create development tickets from production feedback', async () => {
      const feedback: FeedbackLoop = {
        insights: [
          {
            category: 'performance',
            priority: 'high',
            title: 'Database Query Optimization',
            description: 'Slow queries affecting user experience',
            metrics: { current: 1500, target: 500 }
          },
          {
            category: 'reliability',
            priority: 'medium',
            title: 'Cache Reliability Issues',
            description: 'Intermittent cache failures causing degraded performance'
          }
        ],
        developmentActions: [
          {
            type: 'bug-fix',
            priority: 'high',
            title: 'Fix database connection leak',
            description: 'Memory leak in connection pool'
          }
        ]
      };

      const tickets = await service.createDevelopmentTickets(feedback);

      expect(tickets).toEqual({
        created: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/PROD-\d+/),
            type: 'performance-improvement',
            priority: 'high',
            title: 'Database Query Optimization',
            description: expect.stringContaining('Slow queries'),
            labels: expect.arrayContaining(['production-feedback', 'performance']),
            assignee: expect.any(String),
            sprint: expect.any(String),
            estimation: expect.objectContaining({
              storyPoints: expect.any(Number),
              hours: expect.any(Number)
            }),
            acceptanceCriteria: expect.arrayContaining([
              expect.stringContaining('response time'),
              expect.stringContaining('performance test')
            ]),
            linkedMetrics: expect.arrayContaining([
              expect.objectContaining({
                metric: expect.any(String),
                currentValue: expect.any(Number),
                targetValue: expect.any(Number)
              })
            ])
          }),
          expect.objectContaining({
            type: 'bug-fix',
            priority: 'high',
            title: 'Fix database connection leak'
          })
        ]),
        epics: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/EPIC-\d+/),
            title: 'Production Performance Optimization',
            description: expect.any(String),
            tickets: expect.any(Array)
          })
        ]),
        roadmap: expect.objectContaining({
          immediate: expect.any(Array),
          nextSprint: expect.any(Array),
          future: expect.any(Array)
        })
      });
    });
  });

  describe('integrateWithCICD', () => {
    it('should integrate feedback loop with CI/CD pipeline', async () => {
      const integrationConfig = {
        pipeline: 'github-actions',
        productionEnvironment: 'prod',
        stagingEnvironment: 'staging',
        feedbackTriggers: [
          'deployment-complete',
          'performance-degradation',
          'error-spike'
        ],
        automatedActions: [
          'rollback-on-error-spike',
          'scale-on-performance-issue',
          'alert-on-threshold-breach'
        ]
      };

      const integration = await service.integrateWithCICD(integrationConfig);

      expect(integration).toEqual({
        webhooks: expect.arrayContaining([
          expect.objectContaining({
            trigger: 'deployment-complete',
            endpoint: expect.stringMatching(/\/api\/feedback\/deployment/),
            actions: expect.arrayContaining(['collect-metrics', 'analyze-performance'])
          })
        ]),
        automatedChecks: expect.arrayContaining([
          expect.objectContaining({
            name: 'post-deployment-health',
            timeout: expect.any(Number),
            criteria: expect.any(Array),
            actions: expect.objectContaining({
              pass: expect.any(Array),
              fail: expect.any(Array)
            })
          })
        ]),
        rollbackTriggers: expect.arrayContaining([
          expect.objectContaining({
            condition: 'error_rate > 5%',
            duration: '5m',
            action: 'automatic-rollback'
          })
        ]),
        notifications: expect.objectContaining({
          slack: expect.objectContaining({
            channels: expect.any(Array),
            templates: expect.any(Object)
          }),
          email: expect.objectContaining({
            recipients: expect.any(Array)
          })
        }),
        workflows: expect.arrayContaining([
          expect.objectContaining({
            name: 'production-feedback-analysis',
            trigger: expect.any(String),
            steps: expect.any(Array)
          })
        ])
      });
    });
  });

  describe('generateBusinessInsights', () => {
    it('should generate business insights from production metrics', async () => {
      const businessData = {
        metrics: {
          revenue: { daily: 15000, growth: 0.05 },
          users: { active: 5000, new: 200, churn: 0.02 },
          features: [
            { name: 'premium-subscription', adoption: 0.15, revenue: 5000 },
            { name: 'mobile-app', usage: 0.65, satisfaction: 4.2 }
          ]
        },
        performance: {
          conversionRate: 0.08,
          checkoutAbandonmentRate: 0.25,
          averageSessionDuration: 420
        }
      };

      const insights = await service.generateBusinessInsights(businessData);

      expect(insights).toEqual({
        kpis: expect.objectContaining({
          revenue: expect.objectContaining({
            current: 15000,
            growth: 0.05,
            trend: expect.stringMatching(/positive|neutral|negative/),
            forecast: expect.any(Number)
          }),
          userEngagement: expect.objectContaining({
            activeUsers: 5000,
            churnRate: 0.02,
            lifetimeValue: expect.any(Number)
          })
        }),
        opportunities: expect.arrayContaining([
          expect.objectContaining({
            type: 'conversion-optimization',
            description: expect.any(String),
            impact: expect.objectContaining({
              revenue: expect.any(Number),
              users: expect.any(Number)
            }),
            implementation: expect.any(Object)
          })
        ]),
        risks: expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            description: expect.any(String),
            impact: expect.stringMatching(/low|medium|high/),
            mitigation: expect.any(Array)
          })
        ]),
        recommendations: expect.objectContaining({
          product: expect.any(Array),
          engineering: expect.any(Array),
          marketing: expect.any(Array)
        })
      });
    });
  });
});