# Lanka Platform Infrastructure as Code
# Multi-cloud support with AWS as primary provider

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = var.terraform_state_bucket
    key            = "lanka-platform/terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    dynamodb_table = var.terraform_lock_table
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "lanka-platform"
      ManagedBy   = "terraform"
      Owner       = var.owner
      CostCenter  = var.cost_center
    }
  }
}

# Data Sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Random ID for unique resource naming
resource "random_id" "cluster" {
  byte_length = 4
}

# Local values for resource naming and configuration
locals {
  cluster_name = "${var.project_name}-${var.environment}-${random_id.cluster.hex}"
  
  # Common tags
  tags = {
    Environment   = var.environment
    Project       = var.project_name
    Cluster       = local.cluster_name
    ManagedBy     = "terraform"
    Owner         = var.owner
    CostCenter    = var.cost_center
    BackupPolicy  = var.backup_enabled ? "enabled" : "disabled"
    MonitoringEnabled = var.monitoring_enabled
  }
  
  # Network configuration
  vpc_cidr = var.vpc_cidr
  azs      = slice(data.aws_availability_zones.available.names, 0, min(length(data.aws_availability_zones.available.names), 3))
  
  # Subnets CIDR blocks
  private_subnets = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 8, i)]
  public_subnets  = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 8, i + 100)]
  database_subnets = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 8, i + 200)]
}

# Outputs
output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = local.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "vpc_id" {
  description = "ID of the VPC where the cluster is deployed"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "neo4j_endpoint" {
  description = "Neo4j database endpoint"
  value       = aws_instance.neo4j.public_dns
  sensitive   = false
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = false
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}