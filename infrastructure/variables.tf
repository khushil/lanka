# Lanka Platform Infrastructure Variables

# Basic Configuration
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "lanka-platform"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "lanka-team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for cost optimization"
  type        = bool
  default     = false
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in VPC"
  type        = bool
  default     = true
}

# EKS Configuration
variable "cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "cluster_endpoint_private_access" {
  description = "Enable private API server endpoint"
  type        = bool
  default     = false
}

variable "cluster_endpoint_public_access" {
  description = "Enable public API server endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks for public access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Node Group Configuration
variable "node_groups" {
  description = "EKS node groups configuration"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    labels         = map(string)
    taints         = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.medium", "t3.large"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 10
      desired_size   = 2
      labels = {
        role = "general"
      }
      taints = []
    }
    memory_optimized = {
      instance_types = ["r5.large", "r5.xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 5
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
}

# Database Configuration
variable "neo4j_instance_type" {
  description = "Instance type for Neo4j database"
  type        = string
  default     = "t3.large"
}

variable "neo4j_version" {
  description = "Neo4j version"
  type        = string
  default     = "5.14.0"
}

variable "neo4j_volume_size" {
  description = "Size of Neo4j EBS volume in GB"
  type        = number
  default     = 100
}

variable "neo4j_volume_type" {
  description = "Type of EBS volume for Neo4j"
  type        = string
  default     = "gp3"
}

variable "redis_node_type" {
  description = "Instance type for Redis nodes"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "redis_parameter_group_name" {
  description = "Redis parameter group name"
  type        = string
  default     = "default.redis7"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

# Monitoring and Backup
variable "monitoring_enabled" {
  description = "Enable monitoring stack"
  type        = bool
  default     = true
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# Load Balancer Configuration
variable "lb_type" {
  description = "Type of load balancer (application or network)"
  type        = string
  default     = "application"
}

variable "lb_internal" {
  description = "Whether the load balancer is internal"
  type        = bool
  default     = false
}

# SSL/TLS Configuration
variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

# Auto Scaling Configuration
variable "cluster_autoscaler_enabled" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

variable "metrics_server_enabled" {
  description = "Enable metrics server"
  type        = bool
  default     = true
}

variable "horizontal_pod_autoscaler_enabled" {
  description = "Enable horizontal pod autoscaler"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_irsa" {
  description = "Enable IAM Roles for Service Accounts"
  type        = bool
  default     = true
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for EKS secrets"
  type        = bool
  default     = true
}

# Terraform Backend Configuration
variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
  default     = ""
}

variable "terraform_lock_table" {
  description = "DynamoDB table for Terraform state locking"
  type        = string
  default     = ""
}

# Cost Optimization
variable "spot_instances_enabled" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "scheduled_scaling_enabled" {
  description = "Enable scheduled scaling"
  type        = bool
  default     = false
}

# Networking Advanced
variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "flow_logs_retention" {
  description = "VPC Flow Logs retention in days"
  type        = number
  default     = 14
}

# Disaster Recovery
variable "multi_region_enabled" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = false
}

variable "backup_cross_region_enabled" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = false
}

variable "backup_cross_region_destination" {
  description = "Destination region for cross-region backups"
  type        = string
  default     = "us-east-1"
}