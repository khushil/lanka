import { Injectable } from '@nestjs/common';
import { MonitoringRequirements, AlertingConfig, MetricsConfig } from '../../../types';

@Injectable()
export class MonitoringConfigurationService {

  async generatePrometheusConfiguration(config: MonitoringRequirements): Promise<any> {
    return {
      'prometheus.yml': await this.generatePrometheusYml(config),
      'alert.rules.yml': await this.generateAlertRules(config),
      'docker-compose.yml': await this.generatePrometheusDockerCompose(config),
      'grafana-dashboards/': await this.generateGrafanaDashboardFiles(config),
      kubernetes: await this.generatePrometheusKubernetes(config)
    };
  }

  async generateGrafanaDashboards(appConfig: any): Promise<any> {
    const dashboard = await this.createDashboard(appConfig);
    const alerts = await this.createDashboardAlerts(appConfig);
    
    return {
      dashboard,
      alerts
    };
  }

  async generateAlertingRules(alertConfig: AlertingConfig): Promise<any> {
    const groups = [];
    
    if (alertConfig.application) {
      groups.push({
        name: 'application-alerts',
        rules: alertConfig.application.rules.map(rule => ({
          alert: rule.name,
          expr: rule.expr,
          for: rule.for,
          labels: { severity: rule.severity },
          annotations: {
            summary: rule.summary || `${rule.name} alert`,
            description: rule.description || `${rule.name} condition met`
          }
        }))
      });
    }
    
    if (alertConfig.infrastructure) {
      groups.push({
        name: 'infrastructure-alerts',
        rules: alertConfig.infrastructure.rules.map(rule => ({
          alert: rule.name,
          expr: rule.expr,
          for: rule.for,
          labels: { severity: rule.severity },
          annotations: {
            summary: rule.summary || `${rule.name} alert`,
            description: rule.description || `${rule.name} condition met`
          }
        }))
      });
    }
    
    if (alertConfig.business) {
      groups.push({
        name: 'business-alerts',
        rules: alertConfig.business.rules.map(rule => ({
          alert: rule.name,
          expr: rule.expr,
          for: rule.for,
          labels: { severity: rule.severity },
          annotations: {
            summary: rule.summary || `${rule.name} alert`,
            description: rule.description || `${rule.name} condition met`
          }
        }))
      });
    }

    return {
      'prometheus-alerts.yml': `groups:\n${groups.map(g => `  - name: ${g.name}\n    rules:\n${g.rules.map(r => `      - alert: ${r.alert}\n        expr: ${r.expr}\n        for: ${r.for}\n        labels:\n          severity: ${r.labels.severity}\n        annotations:\n          summary: ${r.annotations.summary}\n          description: ${r.annotations.description}`).join('\n')}`).join('\n')}`,
      groups,
      alertmanager: {
        'alertmanager.yml': await this.generateAlertManagerConfig(),
        receivers: [
          {
            name: 'critical-alerts',
            slack_configs: [{
              api_url: '{{ .SlackWebhookURL }}',
              channel: '#alerts',
              title: 'Critical Alert',
              text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
            }],
            email_configs: [{
              to: 'team@company.com',
              subject: 'Critical Alert',
              body: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
            }]
          }
        ]
      }
    };
  }

  async generateLogConfiguration(logConfig: any): Promise<any> {
    if (logConfig.stack === 'elk') {
      return await this.generateELKConfiguration(logConfig);
    } else if (logConfig.stack === 'fluentd') {
      return await this.generateFluentdConfiguration(logConfig);
    }
    
    return await this.generateELKConfiguration(logConfig);
  }

  async generateSyntheticMonitoring(syntheticConfig: any): Promise<any> {
    return {
      blackbox: {
        'blackbox.yml': await this.generateBlackboxConfig(syntheticConfig),
        'prometheus-config.yml': await this.generateBlackboxPrometheusConfig(syntheticConfig)
      },
      puppeteer: {
        'scripts/login-flow.js': await this.generatePuppeteerScript(),
        'package.json': JSON.stringify({
          name: 'synthetic-monitoring',
          dependencies: {
            puppeteer: '^21.0.0'
          }
        }, null, 2)
      },
      kubernetes: {
        'synthetic-monitoring-deployment.yaml': await this.generateSyntheticK8sDeployment()
      },
      alerts: [
        {
          name: 'EndpointDown',
          expr: 'probe_success == 0',
          for: '1m',
          severity: 'critical',
          annotations: {
            summary: 'Endpoint {{ $labels.instance }} is down',
            description: 'Endpoint {{ $labels.instance }} has been down for more than 1 minute'
          }
        }
      ]
    };
  }

  async generateAPMConfiguration(apmConfig: any): Promise<any> {
    const vendor = apmConfig.vendor;
    
    switch (vendor) {
      case 'datadog':
        return await this.generateDatadogAPM(apmConfig);
      case 'newrelic':
        return await this.generateNewRelicAPM(apmConfig);
      case 'elastic-apm':
        return await this.generateElasticAPM(apmConfig);
      default:
        return await this.generateDatadogAPM(apmConfig);
    }
  }

  // Private helper methods
  private async generatePrometheusYml(config: MonitoringRequirements): Promise<string> {
    const targets = config.targets.map(target => `
    - job_name: '${target.name}'
      scrape_interval: ${target.interval}
      static_configs:
        - targets: ['${target.url.replace('http://', '').replace('/metrics', '')}']`).join('');

    return `global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert.rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:${targets}`;
  }

  private async generateAlertRules(config: MonitoringRequirements): Promise<string> {
    if (!config.alerting?.rules) return 'groups: []';
    
    const rules = config.alerting.rules.map(rule => `
  - alert: ${rule.name}
    expr: ${rule.condition}
    for: ${rule.for}
    labels:
      severity: ${rule.severity}
    annotations:
      summary: "${rule.name} triggered"
      description: "${rule.condition} for ${rule.for}"`).join('');

    return `groups:
- name: default
  rules:${rules}`;
  }

  private async generatePrometheusDockerCompose(config: MonitoringRequirements): Promise<string> {
    return `version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=${config.retention || '15d'}'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-dashboards:/var/lib/grafana/dashboards

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  prometheus_data:
  grafana_data:`;
  }

  private async generateGrafanaDashboardFiles(config: MonitoringRequirements): Promise<any> {
    return {
      'application-dashboard.json': JSON.stringify(await this.generateApplicationDashboard(), null, 2),
      'infrastructure-dashboard.json': JSON.stringify(await this.generateInfrastructureDashboard(), null, 2)
    };
  }

  private async generatePrometheusKubernetes(config: MonitoringRequirements): Promise<any> {
    return {
      'prometheus-deployment.yaml': await this.generatePrometheusDeployment(),
      'prometheus-service.yaml': await this.generatePrometheusService(),
      'prometheus-configmap.yaml': await this.generatePrometheusConfigMap(config)
    };
  }

  private async createDashboard(appConfig: any): Promise<any> {
    const panels = [];
    let panelId = 1;

    // HTTP Request Rate panel
    if (appConfig.metrics?.http?.includes('request_count')) {
      panels.push({
        id: panelId++,
        title: 'HTTP Request Rate',
        type: 'graph',
        targets: [{
          expr: `rate(http_requests_total{service="${appConfig.name}"}[5m])`,
          legendFormat: '{{method}} {{status}}'
        }],
        yAxes: [{ label: 'Requests/sec' }]
      });
    }

    // Response Time panel
    if (appConfig.metrics?.http?.includes('request_duration')) {
      panels.push({
        id: panelId++,
        title: 'Response Time',
        type: 'graph',
        targets: [{
          expr: `histogram_quantile(0.95, http_request_duration_seconds_bucket{service="${appConfig.name}"})`,
          legendFormat: '95th percentile'
        }],
        thresholds: [
          { value: appConfig.thresholds?.responseTime?.warning || 500, color: 'yellow' },
          { value: appConfig.thresholds?.responseTime?.critical || 1000, color: 'red' }
        ]
      });
    }

    // Error Rate panel
    if (appConfig.metrics?.http?.includes('error_rate')) {
      panels.push({
        id: panelId++,
        title: 'Error Rate',
        type: 'singlestat',
        targets: [{
          expr: `rate(http_requests_total{service="${appConfig.name}",status=~"5.."}[5m]) / rate(http_requests_total{service="${appConfig.name}"}[5m])`,
          legendFormat: 'Error Rate'
        }],
        colorBackground: true,
        thresholds: '0.01,0.05', // 1%, 5%
        colors: ['green', 'yellow', 'red']
      });
    }

    return {
      id: Math.floor(Math.random() * 1000),
      title: `${appConfig.name.charAt(0).toUpperCase() + appConfig.name.slice(1)} Application Performance`,
      tags: ['application', 'performance'],
      timezone: 'browser',
      panels,
      time: {
        from: 'now-1h',
        to: 'now'
      },
      refresh: '30s'
    };
  }

  private async createDashboardAlerts(appConfig: any): Promise<any[]> {
    const alerts = [];

    if (appConfig.thresholds?.responseTime) {
      alerts.push({
        name: 'High Response Time',
        condition: [{
          query: {
            queryType: '',
            refId: 'A',
            expr: `histogram_quantile(0.95, http_request_duration_seconds_bucket{service="${appConfig.name}"}) > ${appConfig.thresholds.responseTime.warning / 1000}`
          },
          reducer: { type: 'last' },
          evaluator: { params: [appConfig.thresholds.responseTime.warning / 1000], type: 'gt' }
        }],
        executionErrorState: 'alerting',
        noDataState: 'no_data',
        frequency: '10s',
        handler: 1,
        notifications: []
      });
    }

    return alerts;
  }

  private async generateAlertManagerConfig(): Promise<string> {
    return `global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@company.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'

receivers:
- name: 'default'
  email_configs:
  - to: 'team@company.com'
    subject: 'Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}

- name: 'critical-alerts'
  slack_configs:
  - api_url: '{{ .SlackWebhookURL }}'
    channel: '#critical-alerts'
    title: 'Critical Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
  email_configs:
  - to: 'oncall@company.com'
    subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
    body: |
      CRITICAL ALERT
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}`;
  }

  private async generateELKConfiguration(logConfig: any): Promise<any> {
    return {
      elasticsearch: {
        'elasticsearch.yml': await this.generateElasticsearchConfig(logConfig),
        'docker-compose.yml': await this.generateELKDockerCompose(logConfig)
      },
      logstash: {
        'logstash.conf': await this.generateLogstashConfig(logConfig),
        'pipeline.yml': await this.generateLogstashPipeline()
      },
      filebeat: {
        'filebeat.yml': await this.generateFilebeatConfig(logConfig),
        'kubernetes-manifest.yaml': await this.generateFilebeatK8s()
      },
      kibana: {
        'kibana.yml': await this.generateKibanaConfig(),
        'dashboards/': {
          'application-logs.json': JSON.stringify(await this.generateKibanaLogsDashboard(), null, 2),
          'error-analysis.json': JSON.stringify(await this.generateKibanaErrorDashboard(), null, 2)
        }
      }
    };
  }

  private async generateFluentdConfiguration(logConfig: any): Promise<any> {
    return {
      fluentd: {
        'fluent.conf': await this.generateFluentdConfig(logConfig)
      },
      kubernetes: {
        'fluentd-daemonset.yaml': await this.generateFluentdDaemonSet()
      }
    };
  }

  private async generateDatadogAPM(apmConfig: any): Promise<any> {
    return {
      instrumentation: {
        'apm-setup.js': await this.generateDatadogInstrumentation(apmConfig),
        'package.json': {
          dependencies: {
            'dd-trace': '^4.0.0'
          }
        }
      },
      configuration: {
        'datadog.yaml': await this.generateDatadogConfig(apmConfig),
        'docker-compose.yml': await this.generateDatadogDockerCompose()
      },
      kubernetes: {
        'datadog-agent.yaml': await this.generateDatadogK8s()
      },
      dashboards: [
        {
          name: 'APM Overview',
          metrics: ['apm.service.hits', 'apm.service.errors', 'apm.service.apdex']
        }
      ]
    };
  }

  private async generateNewRelicAPM(apmConfig: any): Promise<any> {
    // Implementation for New Relic APM
    return {
      instrumentation: {
        'newrelic.js': `'use strict'\n\nexports.config = {\n  app_name: ['${apmConfig.application.name}'],\n  license_key: process.env.NEW_RELIC_LICENSE_KEY,\n  distributed_tracing: {\n    enabled: true\n  }\n};`,
        'package.json': {
          dependencies: {
            'newrelic': '^10.0.0'
          }
        }
      }
    };
  }

  private async generateElasticAPM(apmConfig: any): Promise<any> {
    // Implementation for Elastic APM
    return {
      instrumentation: {
        'elastic-apm.js': `const apm = require('elastic-apm-node').start({\n  serviceName: '${apmConfig.application.name}',\n  serverUrl: process.env.ELASTIC_APM_SERVER_URL\n});\n\nmodule.exports = apm;`,
        'package.json': {
          dependencies: {
            'elastic-apm-node': '^3.0.0'
          }
        }
      }
    };
  }

  // Additional helper methods for generating various configurations
  private async generateApplicationDashboard(): Promise<any> {
    return {
      id: 1,
      title: 'Application Overview',
      panels: [
        {
          id: 1,
          title: 'Request Rate',
          type: 'graph',
          targets: [{
            expr: 'rate(http_requests_total[5m])',
            legendFormat: '{{method}}'
          }]
        }
      ]
    };
  }

  private async generateInfrastructureDashboard(): Promise<any> {
    return {
      id: 2,
      title: 'Infrastructure Overview',
      panels: [
        {
          id: 1,
          title: 'CPU Usage',
          type: 'graph',
          targets: [{
            expr: '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
            legendFormat: 'CPU Usage %'
          }]
        }
      ]
    };
  }

  private async generatePrometheusDeployment(): Promise<string> {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  labels:
    app: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--web.console.libraries=/etc/prometheus/console_libraries'
          - '--web.console.templates=/etc/prometheus/consoles'
          - '--storage.tsdb.retention.time=15d'
          - '--web.enable-lifecycle'
      volumes:
      - name: config
        configMap:
          name: prometheus-config`;
  }

  private async generatePrometheusService(): Promise<string> {
    return `apiVersion: v1
kind: Service
metadata:
  name: prometheus
  labels:
    app: prometheus
spec:
  selector:
    app: prometheus
  ports:
    - protocol: TCP
      port: 9090
      targetPort: 9090`;
  }

  private async generatePrometheusConfigMap(config: MonitoringRequirements): Promise<string> {
    const prometheusYml = await this.generatePrometheusYml(config);
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
${prometheusYml.split('\n').map(line => '    ' + line).join('\n')}`;
  }

  private async generateBlackboxConfig(syntheticConfig: any): Promise<string> {
    return `modules:
  http_2xx:
    prober: http
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []
      method: GET
  tcp_connect:
    prober: tcp
  pop3s_banner:
    prober: tcp
    tcp:
      query_response:
      - expect: "^+OK"
      tls: true
      tls_config:
        insecure_skip_verify: false`;
  }

  private async generateBlackboxPrometheusConfig(syntheticConfig: any): Promise<string> {
    const targets = syntheticConfig.endpoints.map((endpoint: any) => `        - ${endpoint.url}`).join('\n');
    return `  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
${targets}
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115`;
  }

  private async generatePuppeteerScript(): Promise<string> {
    return `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://app.lanka.dev/login');
    await page.waitForSelector('#username');
    
    await page.type('#username', 'testuser');
    await page.type('#password', 'testpass');
    
    await page.click('#login-button');
    await page.waitForNavigation();
    
    const success = await page.$('.dashboard');
    if (success) {
      console.log('Login flow completed successfully');
      process.exit(0);
    } else {
      console.log('Login flow failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Login flow error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();`;
  }

  private async generateSyntheticK8sDeployment(): Promise<string> {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: synthetic-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: synthetic-monitoring
  template:
    metadata:
      labels:
        app: synthetic-monitoring
    spec:
      containers:
      - name: synthetic-monitoring
        image: synthetic-monitoring:latest
        env:
        - name: TARGETS
          value: "https://api.lanka.dev,https://app.lanka.dev"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi`;
  }

  private async generateElasticsearchConfig(logConfig: any): Promise<string> {
    return `cluster.name: lanka-logs
node.name: elasticsearch-1
path.data: /usr/share/elasticsearch/data
path.logs: /usr/share/elasticsearch/logs
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false`;
  }

  private async generateELKDockerCompose(logConfig: any): Promise<string> {
    return `version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    container_name: logstash
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:`;
  }

  private async generateLogstashConfig(logConfig: any): Promise<string> {
    return `input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][log_type] == "application" {
    json {
      source => "message"
    }
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }
  
  if [fields][log_type] == "nginx" {
    grok {
      match => { "message" => "%{NGINXACCESS}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }
}`;
  }

  private async generateLogstashPipeline(): Promise<string> {
    return `- pipeline.id: main
  path.config: "/usr/share/logstash/pipeline/logstash.conf"`;
  }

  private async generateFilebeatConfig(logConfig: any): Promise<string> {
    const inputs = logConfig.sources.map((source: any) => `
- type: log
  enabled: true
  paths:
    - ${source.path}
  fields:
    log_type: ${source.name}
  fields_under_root: false`).join('');

    return `filebeat.inputs:${inputs}

output.logstash:
  hosts: ["logstash:5044"]

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded`;
  }

  private async generateFilebeatK8s(): Promise<string> {
    return `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  labels:
    app: filebeat
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.8.0
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          readOnly: true
          subPath: filebeat.yml
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0600
          name: filebeat-config
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: varlog
        hostPath:
          path: /var/log`;
  }

  private async generateKibanaConfig(): Promise<string> {
    return `server.host: 0.0.0.0
elasticsearch.hosts: ["http://elasticsearch:9200"]
xpack.monitoring.ui.container.elasticsearch.enabled: false`;
  }

  private async generateKibanaLogsDashboard(): Promise<any> {
    return {
      id: 'logs-dashboard',
      title: 'Application Logs',
      type: 'dashboard',
      panels: [
        {
          id: 1,
          title: 'Log Volume Over Time',
          type: 'histogram'
        },
        {
          id: 2,
          title: 'Log Levels',
          type: 'pie'
        }
      ]
    };
  }

  private async generateKibanaErrorDashboard(): Promise<any> {
    return {
      id: 'error-dashboard',
      title: 'Error Analysis',
      type: 'dashboard',
      panels: [
        {
          id: 1,
          title: 'Error Rate Over Time',
          type: 'line'
        },
        {
          id: 2,
          title: 'Top Errors',
          type: 'table'
        }
      ]
    };
  }

  private async generateFluentdConfig(logConfig: any): Promise<string> {
    return `<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type json
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<match **>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix fluentd
  logstash_dateformat %Y%m%d
  include_tag_key true
  type_name access_log
  tag_key @log_name
  flush_interval 1s
</match>`;
  }

  private async generateFluentdDaemonSet(): Promise<string> {
    return `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  labels:
    app: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers`;
  }

  private async generateDatadogInstrumentation(apmConfig: any): Promise<string> {
    return `const tracer = require('dd-trace').init({
  service: '${apmConfig.application.name}',
  env: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
  profiling: ${apmConfig.profiling?.enabled || false},
  runtimeMetrics: true,
  logInjection: true
});

module.exports = tracer;`;
  }

  private async generateDatadogConfig(apmConfig: any): Promise<string> {
    return `api_key: \${DD_API_KEY}
site: datadoghq.com

apm_config:
  enabled: true
  env: production
  
logs_enabled: true
process_config:
  enabled: "true"
  
network_config:
  enabled: true`;
  }

  private async generateDatadogDockerCompose(): Promise<string> {
    return `version: '3.8'

services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:latest
    environment:
      - DD_API_KEY=\${DD_API_KEY}
      - DD_SITE=datadoghq.com
      - DD_APM_ENABLED=true
      - DD_APM_NON_LOCAL_TRAFFIC=true
      - DD_LOGS_ENABLED=true
      - DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true
      - DD_PROCESS_AGENT_ENABLED=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    ports:
      - "8126:8126"
      - "8125:8125/udp"`;
  }

  private async generateDatadogK8s(): Promise<string> {
    return `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: datadog-agent
  labels:
    app: datadog-agent
spec:
  selector:
    matchLabels:
      app: datadog-agent
  template:
    metadata:
      labels:
        app: datadog-agent
    spec:
      containers:
      - name: agent
        image: gcr.io/datadoghq/agent:latest
        env:
        - name: DD_API_KEY
          valueFrom:
            secretKeyRef:
              name: datadog-secret
              key: api-key
        - name: DD_SITE
          value: "datadoghq.com"
        - name: DD_APM_ENABLED
          value: "true"
        - name: DD_APM_NON_LOCAL_TRAFFIC
          value: "true"
        - name: KUBERNETES
          value: "true"
        - name: DD_KUBERNETES_KUBELET_HOST
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        ports:
        - containerPort: 8125
          name: dogstatsdport
          protocol: UDP
        - containerPort: 8126
          name: traceport
          protocol: TCP
        volumeMounts:
        - name: dockersocket
          mountPath: /var/run/docker.sock
        - name: procdir
          mountPath: /host/proc
          readOnly: true
        - name: cgroups
          mountPath: /host/sys/fs/cgroup
          readOnly: true
      volumes:
      - hostPath:
          path: /var/run/docker.sock
        name: dockersocket
      - hostPath:
          path: /proc
        name: procdir
      - hostPath:
          path: /sys/fs/cgroup
        name: cgroups`;
  }
}