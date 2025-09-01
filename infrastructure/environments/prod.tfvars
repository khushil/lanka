# Lanka Platform - Production Environment Configuration

# Basic Configuration
environment = "prod"
project_name = "lanka-platform"
owner = "production-team"
cost_center = "engineering-production"

# Network Configuration
vpc_cidr = "10.0.0.0/16"
enable_nat_gateway = true
single_nat_gateway = false  # Multi-AZ NAT for high availability
enable_vpn_gateway = true   # VPN access for secure management
enable_dns_hostnames = true
enable_dns_support = true

# EKS Configuration
cluster_version = "1.28"
cluster_endpoint_private_access = true
cluster_endpoint_public_access = true
cluster_endpoint_public_access_cidrs = [
  "10.0.0.0/8",      # Internal networks
  "172.16.0.0/12",   # Private networks
  "192.168.0.0/16"   # Local networks
]

# Node Group Configuration - Production-grade
node_groups = {
  general = {
    instance_types = ["m5.large", "m5.xlarge"]
    capacity_type  = "ON_DEMAND"  # Stability over cost for production
    min_size       = 3
    max_size       = 15
    desired_size   = 5
    labels = {
      role = "general"
    }
    taints = []
  }
  memory_optimized = {
    instance_types = ["r5.xlarge", "r5.2xlarge"]
    capacity_type  = "ON_DEMAND"
    min_size       = 1
    max_size       = 8
    desired_size   = 2
    labels = {
      role = "memory-intensive"
    }
    taints = [{
      key    = "memory-intensive"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]
  }
  compute_optimized = {
    instance_types = ["c5.xlarge", "c5.2xlarge"]
    capacity_type  = "ON_DEMAND"
    min_size       = 0
    max_size       = 5
    desired_size   = 1
    labels = {
      role = "compute-intensive"
    }
    taints = [{
      key    = "compute-intensive"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]
  }
}

# Database Configuration - Production sizing
neo4j_instance_type = "r5.xlarge"  # Memory-optimized for graph database
neo4j_version = "5.14.0"
neo4j_volume_size = 500
neo4j_volume_type = "gp3"

redis_node_type = "cache.r5.large"
redis_num_cache_nodes = 3  # Multi-node cluster for HA
redis_parameter_group_name = "default.redis7"
redis_engine_version = "7.0"

# Monitoring and Backup - Full production setup
monitoring_enabled = true
backup_enabled = true
backup_retention_days = 90  # Extended retention for compliance

# Load Balancer Configuration
lb_type = "application"
lb_internal = false

# SSL/TLS Configuration - Production certificates
certificate_arn = "arn:aws:acm:us-west-2:ACCOUNT:certificate/prod-cert-id"
domain_name = "lanka-platform.com"

# Auto Scaling Configuration - Full auto scaling
cluster_autoscaler_enabled = true
metrics_server_enabled = true
horizontal_pod_autoscaler_enabled = true

# Security Configuration - Maximum security
enable_irsa = true
enable_kms_encryption = true

# Terraform Backend Configuration
terraform_state_bucket = "lanka-platform-terraform-state-prod"
terraform_lock_table = "lanka-platform-terraform-locks"

# Cost Optimization - Balanced approach for production
spot_instances_enabled = false  # No spot instances for critical workloads
scheduled_scaling_enabled = true

# Networking Advanced - Full monitoring
enable_flow_logs = true
flow_logs_retention = 30

# Disaster Recovery - Full DR capability
multi_region_enabled = true
backup_cross_region_enabled = true
backup_cross_region_destination = "us-east-1"

# Production-specific settings
aws_region = "us-west-2"