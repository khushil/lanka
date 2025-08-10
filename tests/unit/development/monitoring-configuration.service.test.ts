import { MonitoringConfigurationService } from '../../../src/modules/development/services/monitoring-configuration.service';
import { MonitoringRequirements, AlertingConfig, MetricsConfig } from '../../../src/types';

describe('MonitoringConfigurationService', () => {
  let service: MonitoringConfigurationService;
  
  beforeEach(() => {
    service = new MonitoringConfigurationService();
  });

  describe('generatePrometheusConfiguration', () => {
    it('should generate comprehensive Prometheus configuration', async () => {
      const config: MonitoringRequirements = {
        targets: [
          { name: 'lanka-api', url: 'http://api:8080/metrics', interval: '30s' },
          { name: 'postgres', url: 'http://postgres-exporter:9187/metrics', interval: '60s' },
          { name: 'redis', url: 'http://redis-exporter:9121/metrics', interval: '30s' }
        ],
        retention: '30d',
        storage: '50Gi',
        alerting: {
          enabled: true,
          rules: [
            { name: 'high-cpu', condition: 'cpu_usage > 80', for: '5m', severity: 'warning' },
            { name: 'service-down', condition: 'up == 0', for: '1m', severity: 'critical' }
          ]
        },
        grafana: {
          enabled: true,
          dashboards: ['application', 'infrastructure', 'business']
        }
      };

      const prometheus = await service.generatePrometheusConfiguration(config);

      expect(prometheus).toEqual({
        'prometheus.yml': expect.stringContaining('global:'),
        'alert.rules.yml': expect.stringContaining('groups:'),
        'docker-compose.yml': expect.stringContaining('prometheus:'),
        'grafana-dashboards/': expect.objectContaining({
          'application-dashboard.json': expect.any(String),
          'infrastructure-dashboard.json': expect.any(String)
        }),
        kubernetes: expect.objectContaining({
          'prometheus-deployment.yaml': expect.stringContaining('kind: Deployment'),
          'prometheus-service.yaml': expect.stringContaining('kind: Service'),
          'prometheus-configmap.yaml': expect.stringContaining('kind: ConfigMap')
        })
      });

      // Verify prometheus.yml structure
      const prometheusYml = prometheus['prometheus.yml'];
      expect(prometheusYml).toMatch(/scrape_interval: 15s/);
      expect(prometheusYml).toMatch(/job_name: 'lanka-api'/);
      expect(prometheusYml).toMatch(/alerting:/);
      expect(prometheusYml).toMatch(/rule_files:/);
    });
  });

  describe('generateGrafanaDashboards', () => {
    it('should generate application performance dashboard', async () => {
      const appConfig = {
        name: 'lanka-application',
        metrics: {
          http: ['request_duration', 'request_count', 'error_rate'],
          database: ['connection_pool', 'query_duration', 'active_connections'],
          cache: ['hit_rate', 'memory_usage', 'evictions'],
          business: ['user_registrations', 'orders_completed', 'revenue']
        },
        thresholds: {
          responseTime: { warning: 500, critical: 1000 },
          errorRate: { warning: 0.05, critical: 0.1 },
          cpuUsage: { warning: 70, critical: 85 }
        }
      };

      const dashboard = await service.generateGrafanaDashboards(appConfig);

      expect(dashboard).toEqual({
        dashboard: expect.objectContaining({
          id: expect.any(Number),
          title: 'Lanka Application Performance',
          tags: expect.arrayContaining(['application', 'performance']),
          panels: expect.arrayContaining([
            expect.objectContaining({
              title: 'HTTP Request Rate',
              type: 'graph',
              targets: expect.arrayContaining([
                expect.objectContaining({
                  expr: expect.stringContaining('rate(http_requests_total')
                })
              ])
            }),
            expect.objectContaining({
              title: 'Response Time',
              type: 'graph',
              thresholds: expect.arrayContaining([
                expect.objectContaining({ value: 500, color: 'yellow' }),
                expect.objectContaining({ value: 1000, color: 'red' })
              ])
            }),
            expect.objectContaining({
              title: 'Error Rate',
              type: 'singlestat',
              colorBackground: true
            })
          ])
        }),
        alerts: expect.arrayContaining([
          expect.objectContaining({
            name: 'High Response Time',
            condition: expect.any(Array),
            frequency: '10s'
          })
        ])
      });
    });

    it('should generate infrastructure monitoring dashboard', async () => {
      const infraConfig = {
        components: ['kubernetes', 'aws', 'database'],
        resources: ['cpu', 'memory', 'disk', 'network'],
        services: ['api-gateway', 'load-balancer', 'cache']
      };

      const dashboard = await service.generateGrafanaDashboards(infraConfig);

      expect(dashboard.dashboard.title).toContain('Infrastructure');
      expect(dashboard.dashboard.panels).toContainEqual(
        expect.objectContaining({
          title: 'CPU Usage',
          type: 'graph'
        })
      );
    });
  });

  describe('generateAlertingRules', () => {
    it('should generate comprehensive alerting rules', async () => {
      const alertConfig: AlertingConfig = {
        application: {
          rules: [
            {
              name: 'HighErrorRate',
              expr: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1',
              for: '5m',
              severity: 'critical',
              summary: 'High error rate detected',
              description: 'Error rate is above 10% for 5 minutes'
            },
            {
              name: 'SlowResponseTime',
              expr: 'histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1',
              for: '10m',
              severity: 'warning',
              summary: '95th percentile response time is slow'
            }
          ]
        },
        infrastructure: {
          rules: [
            {
              name: 'HighCPUUsage',
              expr: '(100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80',
              for: '5m',
              severity: 'warning'
            },
            {
              name: 'HighMemoryUsage',
              expr: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90',
              for: '5m',
              severity: 'critical'
            }
          ]
        },
        business: {
          rules: [
            {
              name: 'OrderProcessingDown',
              expr: 'increase(orders_processed_total[1h]) < 10',
              for: '1h',
              severity: 'critical',
              summary: 'Order processing is significantly down'
            }
          ]
        }
      };

      const rules = await service.generateAlertingRules(alertConfig);

      expect(rules).toEqual({
        'prometheus-alerts.yml': expect.stringContaining('groups:'),
        groups: expect.arrayContaining([
          expect.objectContaining({
            name: 'application-alerts',
            rules: expect.arrayContaining([
              expect.objectContaining({
                alert: 'HighErrorRate',
                expr: expect.stringContaining('rate(http_requests_total{status=~"5.."}'),
                for: '5m',
                labels: expect.objectContaining({
                  severity: 'critical'
                }),
                annotations: expect.objectContaining({
                  summary: expect.any(String),
                  description: expect.any(String)
                })
              })
            ])
          }),
          expect.objectContaining({
            name: 'infrastructure-alerts',
            rules: expect.any(Array)
          }),
          expect.objectContaining({
            name: 'business-alerts',
            rules: expect.any(Array)
          })
        ]),
        alertmanager: expect.objectContaining({
          'alertmanager.yml': expect.stringContaining('route:'),
          receivers: expect.arrayContaining([
            expect.objectContaining({
              name: 'critical-alerts',
              slack_configs: expect.any(Array),
              email_configs: expect.any(Array)
            })
          ])
        })
      });
    });
  });

  describe('generateLogConfiguration', () => {
    it('should generate ELK stack configuration', async () => {
      const logConfig = {
        stack: 'elk',
        sources: [
          { name: 'application', path: '/var/log/app/*.log', type: 'json' },
          { name: 'nginx', path: '/var/log/nginx/*.log', type: 'nginx' },
          { name: 'kubernetes', namespace: 'default', type: 'json' }
        ],
        retention: '30d',
        indexing: {
          strategy: 'daily',
          shards: 2,
          replicas: 1
        },
        kibana: {
          dashboards: ['application-logs', 'error-analysis', 'performance-logs']
        }
      };

      const elkConfig = await service.generateLogConfiguration(logConfig);

      expect(elkConfig).toEqual({
        elasticsearch: expect.objectContaining({
          'elasticsearch.yml': expect.stringContaining('cluster.name:'),
          'docker-compose.yml': expect.stringContaining('elasticsearch:')
        }),
        logstash: expect.objectContaining({
          'logstash.conf': expect.stringContaining('input {'),
          'pipeline.yml': expect.stringContaining('pipeline.id:')
        }),
        filebeat: expect.objectContaining({
          'filebeat.yml': expect.stringContaining('filebeat.inputs:'),
          'kubernetes-manifest.yaml': expect.stringContaining('kind: DaemonSet')
        }),
        kibana: expect.objectContaining({
          'kibana.yml': expect.stringContaining('server.host:'),
          'dashboards/': expect.objectContaining({
            'application-logs.json': expect.any(String),
            'error-analysis.json': expect.any(String)
          })
        })
      });
    });

    it('should generate Fluentd configuration for Kubernetes', async () => {
      const logConfig = {
        stack: 'fluentd',
        platform: 'kubernetes',
        outputs: ['elasticsearch', 's3', 'cloudwatch']
      };

      const fluentdConfig = await service.generateLogConfiguration(logConfig);

      expect(fluentdConfig.fluentd['fluent.conf']).toContain('<source>');
      expect(fluentdConfig.fluentd['fluent.conf']).toContain('<match **>');
      expect(fluentdConfig.kubernetes['fluentd-daemonset.yaml']).toContain('kind: DaemonSet');
    });
  });

  describe('generateSyntheticMonitoring', () => {
    it('should generate synthetic monitoring configuration', async () => {
      const syntheticConfig = {
        endpoints: [
          {
            name: 'api-health',
            url: 'https://api.lanka.dev/health',
            method: 'GET',
            expectedStatus: 200,
            interval: '30s',
            timeout: '5s'
          },
          {
            name: 'user-login',
            url: 'https://app.lanka.dev/login',
            type: 'browser',
            script: 'login-flow.js',
            interval: '5m'
          }
        ],
        locations: ['us-east', 'eu-west', 'asia-pacific'],
        alerting: {
          consecutiveFailures: 3,
          escalation: ['slack', 'pagerduty']
        }
      };

      const synthetic = await service.generateSyntheticMonitoring(syntheticConfig);

      expect(synthetic).toEqual({
        blackbox: expect.objectContaining({
          'blackbox.yml': expect.stringContaining('modules:'),
          'prometheus-config.yml': expect.stringContaining('blackbox')
        }),
        puppeteer: expect.objectContaining({
          'scripts/login-flow.js': expect.stringContaining('await page.'),
          'package.json': expect.stringContaining('puppeteer')
        }),
        kubernetes: expect.objectContaining({
          'synthetic-monitoring-deployment.yaml': expect.stringContaining('kind: Deployment')
        }),
        alerts: expect.arrayContaining([
          expect.objectContaining({
            name: 'EndpointDown',
            expr: expect.stringContaining('probe_success == 0'),
            severity: 'critical'
          })
        ])
      });
    });
  });

  describe('generateAPMConfiguration', () => {
    it('should generate application performance monitoring setup', async () => {
      const apmConfig = {
        application: {
          name: 'lanka-api',
          runtime: 'node.js',
          framework: 'express'
        },
        tracing: {
          enabled: true,
          samplingRate: 0.1,
          services: ['database', 'cache', 'external-api']
        },
        profiling: {
          enabled: true,
          interval: '30s'
        },
        vendor: 'datadog' // or 'newrelic', 'elastic-apm'
      };

      const apm = await service.generateAPMConfiguration(apmConfig);

      expect(apm).toEqual({
        instrumentation: expect.objectContaining({
          'apm-setup.js': expect.stringContaining('require('),
          'package.json': expect.objectContaining({
            dependencies: expect.objectContaining({
              'dd-trace': expect.any(String)
            })
          })
        }),
        configuration: expect.objectContaining({
          'datadog.yaml': expect.stringContaining('apm_config:'),
          'docker-compose.yml': expect.stringContaining('datadog-agent:')
        }),
        kubernetes: expect.objectContaining({
          'datadog-agent.yaml': expect.stringContaining('kind: DaemonSet')
        }),
        dashboards: expect.arrayContaining([
          expect.objectContaining({
            name: 'APM Overview',
            metrics: expect.any(Array)
          })
        ])
      });
    });
  });
});