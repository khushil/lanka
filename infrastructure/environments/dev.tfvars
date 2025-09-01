# Lanka Platform - Development Environment Configuration

# Basic Configuration
environment = "dev"
project_name = "lanka-platform"
owner = "development-team"
cost_center = "engineering-dev"

# Network Configuration
vpc_cidr = "10.10.0.0/16"
enable_nat_gateway = true
single_nat_gateway = true  # Cost optimization for dev
enable_vpn_gateway = false
enable_dns_hostnames = true
enable_dns_support = true

# EKS Configuration
cluster_version = "1.28"
cluster_endpoint_private_access = false
cluster_endpoint_public_access = true
cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]

# Node Group Configuration - Optimized for development
node_groups = {
  general = {
    instance_types = ["t3.medium"]
    capacity_type  = "SPOT"  # Cost optimization
    min_size       = 1
    max_size       = 3
    desired_size   = 2
    labels = {
      role = "general"
    }
    taints = []
  }
}

# Database Configuration - Smaller instances for dev
neo4j_instance_type = "t3.small"
neo4j_version = "5.14.0"
neo4j_volume_size = 20
neo4j_volume_type = "gp3"

redis_node_type = "cache.t3.micro"
redis_num_cache_nodes = 1
redis_parameter_group_name = "default.redis7"
redis_engine_version = "7.0"

# Monitoring and Backup - Reduced for dev
monitoring_enabled = true
backup_enabled = false  # Disabled for dev environment
backup_retention_days = 7

# Load Balancer Configuration
lb_type = "application"
lb_internal = false

# SSL/TLS Configuration - No SSL for dev
certificate_arn = ""
domain_name = ""

# Auto Scaling Configuration - Limited scaling for dev
cluster_autoscaler_enabled = true
metrics_server_enabled = true
horizontal_pod_autoscaler_enabled = true

# Security Configuration - Relaxed for dev
enable_irsa = true
enable_kms_encryption = false  # Disabled for cost optimization

# Terraform Backend Configuration
terraform_state_bucket = "lanka-platform-terraform-state-dev"
terraform_lock_table = "lanka-platform-terraform-locks"

# Cost Optimization - Aggressive for dev
spot_instances_enabled = true
scheduled_scaling_enabled = false

# Networking Advanced
enable_flow_logs = false  # Disabled for cost
flow_logs_retention = 7

# Disaster Recovery - Minimal for dev
multi_region_enabled = false
backup_cross_region_enabled = false
backup_cross_region_destination = "us-east-1"

# Development-specific settings
aws_region = "us-west-2"