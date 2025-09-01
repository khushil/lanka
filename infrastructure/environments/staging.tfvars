# Lanka Platform - Staging Environment Configuration

# Basic Configuration
environment = "staging"
project_name = "lanka-platform"
owner = "staging-team"
cost_center = "engineering-staging"

# Network Configuration
vpc_cidr = "10.20.0.0/16"
enable_nat_gateway = true
single_nat_gateway = false  # Multi-AZ for higher availability
enable_vpn_gateway = false
enable_dns_hostnames = true
enable_dns_support = true

# EKS Configuration
cluster_version = "1.28"
cluster_endpoint_private_access = true
cluster_endpoint_public_access = true
cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]

# Node Group Configuration - Balanced for staging
node_groups = {
  general = {
    instance_types = ["t3.medium", "t3.large"]
    capacity_type  = "ON_DEMAND"  # More stable for staging tests
    min_size       = 2
    max_size       = 6
    desired_size   = 3
    labels = {
      role = "general"
    }
    taints = []
  }
  memory_optimized = {
    instance_types = ["r5.large"]
    capacity_type  = "SPOT"  # Cost optimization with some risk
    min_size       = 0
    max_size       = 3
    desired_size   = 1
    labels = {
      role = "memory-intensive"
    }
    taints = [{
      key    = "memory-intensive"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]
  }
}

# Database Configuration - Production-like sizing
neo4j_instance_type = "t3.medium"
neo4j_version = "5.14.0"
neo4j_volume_size = 50
neo4j_volume_type = "gp3"

redis_node_type = "cache.t3.small"
redis_num_cache_nodes = 2  # Multi-node for HA testing
redis_parameter_group_name = "default.redis7"
redis_engine_version = "7.0"

# Monitoring and Backup - Production-like
monitoring_enabled = true
backup_enabled = true
backup_retention_days = 14

# Load Balancer Configuration
lb_type = "application"
lb_internal = false

# SSL/TLS Configuration - Self-signed or staging cert
certificate_arn = "arn:aws:acm:us-west-2:ACCOUNT:certificate/staging-cert-id"
domain_name = "staging.lanka-platform.internal"

# Auto Scaling Configuration - Similar to production
cluster_autoscaler_enabled = true
metrics_server_enabled = true
horizontal_pod_autoscaler_enabled = true

# Security Configuration - Production-like
enable_irsa = true
enable_kms_encryption = true

# Terraform Backend Configuration
terraform_state_bucket = "lanka-platform-terraform-state-staging"
terraform_lock_table = "lanka-platform-terraform-locks"

# Cost Optimization - Moderate
spot_instances_enabled = true
scheduled_scaling_enabled = true

# Networking Advanced
enable_flow_logs = true
flow_logs_retention = 14

# Disaster Recovery - Basic DR testing
multi_region_enabled = false
backup_cross_region_enabled = true
backup_cross_region_destination = "us-east-1"

# Staging-specific settings
aws_region = "us-west-2"