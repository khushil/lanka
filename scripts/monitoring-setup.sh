#!/bin/bash

# Lanka Platform Monitoring Setup Script
# Sets up comprehensive monitoring and observability stack

set -e

echo "🚀 Setting up Lanka Platform Monitoring Stack..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Create necessary directories
create_directories() {
    print_status "Creating monitoring directories..."
    
    mkdir -p config/prometheus/rules
    mkdir -p config/grafana/provisioning/datasources
    mkdir -p config/grafana/provisioning/dashboards
    mkdir -p config/grafana/dashboards
    mkdir -p config/alertmanager/templates
    mkdir -p config/logstash/pipeline
    mkdir -p config/kibana
    mkdir -p config/loki
    mkdir -p config/promtail
    mkdir -p config/blackbox
    mkdir -p logs
    
    print_success "Directories created"
}

# Create Grafana datasources configuration
create_grafana_datasources() {
    print_status "Creating Grafana datasources configuration..."
    
    cat > config/grafana/provisioning/datasources/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    orgId: 1
    url: http://prometheus:9090
    basicAuth: false
    isDefault: true
    version: 1
    editable: false
    jsonData:
      httpMethod: POST
      manageAlerts: true
      prometheusType: Prometheus
      prometheusVersion: 2.45.0
      cacheLevel: 'High'
      disableRecordingRules: false
      incrementalQueryOverlapWindow: 10m

  - name: Loki
    type: loki
    access: proxy
    orgId: 1
    url: http://loki:3100
    basicAuth: false
    version: 1
    editable: false
    jsonData:
      maxLines: 1000
      derivedFields:
        - datasourceUid: jaeger-uid
          matcherRegex: "traceID=(\\w+)"
          name: TraceID
          url: '$${__value.raw}'

  - name: Jaeger
    type: jaeger
    access: proxy
    orgId: 1
    url: http://jaeger-all-in-one:16686
    basicAuth: false
    version: 1
    editable: false
    uid: jaeger-uid
    jsonData:
      tracesToLogs:
        datasourceUid: 'loki'
        tags: [{'key': 'service.name', 'value': 'service'}, {'key': 'service.instance.id', 'value': 'instance'}]
        mappedTags: [{'key': 'service.name', 'value': 'service'}]
        mapTagNamesEnabled: true
        spanStartTimeShift: '1h'
        spanEndTimeShift: '1h'
        filterByTraceID: true
        filterBySpanID: true
EOF
    
    print_success "Grafana datasources configuration created"
}

# Create Grafana dashboards provisioning
create_grafana_dashboards_config() {
    print_status "Creating Grafana dashboards configuration..."
    
    cat > config/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'Lanka Platform'
    orgId: 1
    folder: 'Lanka'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    print_success "Grafana dashboards configuration created"
}

# Create Blackbox Exporter configuration
create_blackbox_config() {
    print_status "Creating Blackbox Exporter configuration..."
    
    cat > config/blackbox/blackbox.yml << 'EOF'
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200, 201, 202, 204]
      method: GET
      headers:
        Host: lanka.platform
        Accept-Language: en-US
      no_follow_redirects: false
      fail_if_ssl: false
      fail_if_not_ssl: false
      tls_config:
        insecure_skip_verify: false
      preferred_ip_protocol: "ip4"
      ip_protocol_fallback: false
  
  http_post_2xx:
    prober: http
    timeout: 5s
    http:
      method: POST
      headers:
        Content-Type: application/json
      body: '{"health": "check"}'
  
  tcp_connect:
    prober: tcp
    timeout: 5s
  
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
      source_ip_address: "0.0.0.0"
EOF
    
    print_success "Blackbox Exporter configuration created"
}

# Create Loki configuration
create_loki_config() {
    print_status "Creating Loki configuration..."
    
    cat > config/loki/loki.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093

analytics:
  reporting_enabled: false
EOF
    
    print_success "Loki configuration created"
}

# Create Promtail configuration
create_promtail_config() {
    print_status "Creating Promtail configuration..."
    
    cat > config/promtail/promtail.yml << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: container-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log
    
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|]*))
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output

  - job_name: system-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/*log
EOF
    
    print_success "Promtail configuration created"
}

# Create environment file template
create_env_template() {
    print_status "Creating environment template..."
    
    cat > .env.monitoring.template << 'EOF'
# Lanka Platform Monitoring Environment Variables

# Grafana Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123

# Elasticsearch Configuration
ELASTICSEARCH_SECURITY_ENABLED=false
ELASTICSEARCH_PASSWORD=

# Email Alerts Configuration
SMTP_USERNAME=
SMTP_PASSWORD=
ALERT_EMAIL_CRITICAL=ops@lanka.platform
ALERT_EMAIL_WARNING=dev@lanka.platform
ALERT_EMAIL_MEMORY=dev@lanka.platform

# Webhook Configuration
WEBHOOK_USERNAME=admin
WEBHOOK_PASSWORD=admin123

# Slack Integration (optional)
SLACK_WEBHOOK_URL=

# Application Configuration
ENVIRONMENT=development
ENABLE_TRACING=true
ENABLE_ELASTICSEARCH_LOGGING=true
JAEGER_ENDPOINT=http://localhost:16686/api/traces
PROMETHEUS_METRICS_PORT=9090
EOF
    
    if [ ! -f .env.monitoring ]; then
        cp .env.monitoring.template .env.monitoring
        print_success "Environment template created (.env.monitoring)"
        print_warning "Please configure .env.monitoring with your specific settings"
    else
        print_warning "Environment file .env.monitoring already exists, skipping"
    fi
}

# Set proper permissions
set_permissions() {
    print_status "Setting proper permissions..."
    
    chmod +x scripts/monitoring-*.sh
    chmod 644 config/prometheus/prometheus.yml
    chmod 644 config/prometheus/rules/*.yml
    chmod 644 config/alertmanager/alertmanager.yml
    
    print_success "Permissions set"
}

# Start monitoring stack
start_monitoring() {
    print_status "Starting monitoring stack..."
    
    # Load environment variables
    if [ -f .env.monitoring ]; then
        export $(cat .env.monitoring | grep -v '^#' | xargs)
    fi
    
    # Start the monitoring stack
    docker-compose -f docker-compose.monitoring.yml up -d
    
    print_success "Monitoring stack started"
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    print_status "Checking service health..."
    
    services=("prometheus:9090" "grafana:3000" "jaeger-all-in-one:16686" "elasticsearch:9200" "loki:3100")
    
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        
        if curl -f -s "http://localhost:$port" > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_warning "$name may not be ready yet (this is normal on first startup)"
        fi
    done
}

# Display access information
display_access_info() {
    echo ""
    echo "🎉 Lanka Platform Monitoring Stack Setup Complete!"
    echo ""
    echo "📊 Access URLs:"
    echo "  • Grafana:      http://localhost:3000 (admin/admin123)"
    echo "  • Prometheus:   http://localhost:9090"
    echo "  • Jaeger UI:    http://localhost:16686"
    echo "  • Kibana:       http://localhost:5601"
    echo "  • AlertManager: http://localhost:9093"
    echo ""
    echo "📋 Application Endpoints:"
    echo "  • Metrics:      http://localhost:4000/metrics"
    echo "  • Health:       http://localhost:4000/health"
    echo "  • Memory Stats: http://localhost:4000/api/memory/stats"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • Stop:         docker-compose -f docker-compose.monitoring.yml down"
    echo "  • Logs:         docker-compose -f docker-compose.monitoring.yml logs -f"
    echo "  • Restart:      docker-compose -f docker-compose.monitoring.yml restart"
    echo ""
    echo "📖 Next Steps:"
    echo "  1. Configure .env.monitoring with your specific settings"
    echo "  2. Start your Lanka Platform application"
    echo "  3. Import additional Grafana dashboards if needed"
    echo "  4. Configure alert channels (email, Slack, etc.)"
    echo ""
}

# Main execution
main() {
    echo "Lanka Platform Monitoring Setup"
    echo "==============================="
    echo ""
    
    check_dependencies
    create_directories
    create_grafana_datasources
    create_grafana_dashboards_config
    create_blackbox_config
    create_loki_config
    create_promtail_config
    create_env_template
    set_permissions
    
    # Ask if user wants to start the monitoring stack
    read -p "Do you want to start the monitoring stack now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_monitoring
    else
        print_status "Monitoring stack configured but not started"
        print_status "To start later, run: docker-compose -f docker-compose.monitoring.yml up -d"
    fi
    
    display_access_info
}

# Run main function
main "$@"
