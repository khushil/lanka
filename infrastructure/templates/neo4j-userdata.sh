#!/bin/bash
# Lanka Platform Neo4j Installation Script

set -e

# Variables
NEO4J_VERSION="${neo4j_version}"
CLUSTER_NAME="${cluster_name}"
ENVIRONMENT="${environment}"

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \
    curl \
    wget \
    gnupg \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    unzip \
    jq

# Install Java 11 (required for Neo4j)
apt-get install -y openjdk-11-jdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Add Neo4j repository
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | tee -a /etc/apt/sources.list.d/neo4j.list
apt-get update

# Install Neo4j
apt-get install -y neo4j=$${NEO4J_VERSION}*

# Configure Neo4j
mkdir -p /var/lib/neo4j/data
mkdir -p /var/log/neo4j
mkdir -p /etc/neo4j

# Wait for EBS volume to be attached
sleep 30

# Format and mount EBS volume
if [ ! -e /dev/nvme1n1 ]; then
    # Check for different device names
    if [ -e /dev/xvdf ]; then
        DEVICE="/dev/xvdf"
    else
        DEVICE="/dev/nvme1n1"
    fi
else
    DEVICE="/dev/nvme1n1"
fi

# Format if not already formatted
if ! blkid $DEVICE; then
    mkfs.ext4 $DEVICE
fi

# Mount the volume
mount $DEVICE /var/lib/neo4j/data

# Add to fstab for persistence
echo "$DEVICE /var/lib/neo4j/data ext4 defaults,nofail 0 2" >> /etc/fstab

# Set ownership
chown -R neo4j:neo4j /var/lib/neo4j
chown -R neo4j:neo4j /var/log/neo4j

# Neo4j configuration
cat > /etc/neo4j/neo4j.conf << EOF
# Network connector configuration
dbms.default_listen_address=0.0.0.0
dbms.default_advertised_address=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)

# HTTP Connector
dbms.connector.http.enabled=true
dbms.connector.http.listen_address=:7474

# HTTPS Connector
dbms.connector.https.enabled=true
dbms.connector.https.listen_address=:7473

# Bolt connector
dbms.connector.bolt.enabled=true
dbms.connector.bolt.listen_address=:7687

# Paths
dbms.directories.data=/var/lib/neo4j/data
dbms.directories.logs=/var/log/neo4j

# Memory settings (adjust based on instance size)
dbms.memory.heap.initial_size=1g
dbms.memory.heap.max_size=2g
dbms.memory.pagecache.size=1g

# Security
dbms.security.auth_enabled=true
dbms.security.procedures.unrestricted=apoc.*

# Performance
dbms.tx_log.rotation.retention_policy=2G size
dbms.checkpoint.interval.time=30s

# Monitoring
metrics.enabled=true
metrics.csv.enabled=true
metrics.csv.interval=30s
metrics.jmx.enabled=true
metrics.prometheus.enabled=true
metrics.prometheus.endpoint=0.0.0.0:2004

# Logging
dbms.logs.query.enabled=true
dbms.logs.query.threshold=1s
dbms.track_query_cpu_time=true
dbms.track_query_allocation=true

# APOC configuration
dbms.security.procedures.allowlist=apoc.*
dbms.security.procedures.unrestricted=apoc.*

EOF

# Install APOC plugin
wget -O /var/lib/neo4j/plugins/apoc-$${NEO4J_VERSION}-core.jar \
    https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/$${NEO4J_VERSION}/apoc-$${NEO4J_VERSION}-core.jar

# Set initial password
neo4j-admin set-initial-password "LankaPlatform2024!"

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# CloudWatch agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "metrics": {
    "namespace": "Lanka/$${CLUSTER_NAME}/Neo4j",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time",
          "read_bytes",
          "write_bytes",
          "reads",
          "writes"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          "swap_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/neo4j/neo4j.log",
            "log_group_name": "$${CLUSTER_NAME}-neo4j-logs",
            "log_stream_name": "{instance_id}/neo4j.log"
          },
          {
            "file_path": "/var/log/neo4j/query.log",
            "log_group_name": "$${CLUSTER_NAME}-neo4j-logs", 
            "log_stream_name": "{instance_id}/query.log"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Create backup script
cat > /usr/local/bin/neo4j-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/tmp/neo4j-backup"
S3_BUCKET="$1"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Stop Neo4j
systemctl stop neo4j

# Create backup
tar -czf $BACKUP_DIR/neo4j-backup-$DATE.tar.gz -C /var/lib/neo4j data

# Start Neo4j
systemctl start neo4j

# Upload to S3
aws s3 cp $BACKUP_DIR/neo4j-backup-$DATE.tar.gz s3://$S3_BUCKET/neo4j/

# Cleanup local backup
rm -rf $BACKUP_DIR
EOF

chmod +x /usr/local/bin/neo4j-backup.sh

# Create systemd service for backups
cat > /etc/systemd/system/neo4j-backup.service << EOF
[Unit]
Description=Neo4j Backup Service
After=neo4j.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/neo4j-backup.sh $${CLUSTER_NAME}-database-backups
User=neo4j
EOF

# Create backup timer (daily at 2 AM)
cat > /etc/systemd/system/neo4j-backup.timer << EOF
[Unit]
Description=Daily Neo4j Backup
Requires=neo4j-backup.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=30min

[Install]
WantedBy=timers.target
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable neo4j
systemctl enable neo4j-backup.timer
systemctl start neo4j-backup.timer

# Start Neo4j
systemctl start neo4j

# Wait for Neo4j to be ready
sleep 30

# Health check
until $(curl --output /dev/null --silent --head --fail http://localhost:7474); do
    echo "Waiting for Neo4j to start..."
    sleep 5
done

echo "Neo4j installation completed successfully"