#!/bin/bash

# Lanka Platform Terraform Backend Setup Script
# This script initializes the Terraform backend infrastructure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"

# Default values
ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-west-2}"
PROJECT_NAME="lanka-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    local tools=("aws" "terraform" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured properly"
        exit 1
    fi
    
    # Check Terraform version
    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    log_info "Using Terraform version: $tf_version"
    
    log_success "Prerequisites check passed"
}

# Function to generate unique suffix
generate_suffix() {
    echo $(date +%Y%m%d)-$(openssl rand -hex 4)
}

# Function to create S3 bucket for Terraform state
create_state_bucket() {
    local bucket_name="${PROJECT_NAME}-terraform-state-${ENVIRONMENT}-$(generate_suffix)"
    
    log_info "Creating S3 bucket for Terraform state: $bucket_name"
    
    # Create bucket
    if aws s3 ls "s3://$bucket_name" 2>/dev/null; then
        log_warn "Bucket $bucket_name already exists"
    else
        aws s3 mb "s3://$bucket_name" --region "$AWS_REGION"
        log_success "Created S3 bucket: $bucket_name"
    fi
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$bucket_name" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$bucket_name" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": true
                }
            ]
        }'
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$bucket_name" \
        --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
    
    # Add lifecycle policy
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$bucket_name" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "ID": "terraform-state-lifecycle",
                    "Status": "Enabled",
                    "NoncurrentVersionExpiration": {
                        "NoncurrentDays": 90
                    },
                    "AbortIncompleteMultipartUpload": {
                        "DaysAfterInitiation": 7
                    }
                }
            ]
        }'
    
    echo "$bucket_name"
}

# Function to create DynamoDB table for state locking
create_lock_table() {
    local table_name="${PROJECT_NAME}-terraform-locks-${ENVIRONMENT}"
    
    log_info "Creating DynamoDB table for state locking: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --region "$AWS_REGION" &>/dev/null; then
        log_warn "DynamoDB table $table_name already exists"
    else
        aws dynamodb create-table \
            --table-name "$table_name" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
            --sse-specification Enabled=true \
            --region "$AWS_REGION"
        
        # Wait for table to be created
        log_info "Waiting for DynamoDB table to be created..."
        aws dynamodb wait table-exists --table-name "$table_name" --region "$AWS_REGION"
        log_success "Created DynamoDB table: $table_name"
    fi
    
    echo "$table_name"
}

# Function to create backend configuration file
create_backend_config() {
    local bucket_name="$1"
    local table_name="$2"
    local config_file="$INFRASTRUCTURE_DIR/environments/${ENVIRONMENT}.backend.tfvars"
    
    log_info "Creating backend configuration file: $config_file"
    
    cat > "$config_file" << EOF
# Terraform Backend Configuration for ${ENVIRONMENT}
bucket         = "${bucket_name}"
key            = "${ENVIRONMENT}/terraform.tfstate"
region         = "${AWS_REGION}"
encrypt        = true
dynamodb_table = "${table_name}"
EOF
    
    log_success "Backend configuration created: $config_file"
}

# Function to initialize Terraform with backend
initialize_terraform() {
    local bucket_name="$1"
    local table_name="$2"
    
    log_info "Initializing Terraform with backend configuration..."
    
    cd "$INFRASTRUCTURE_DIR"
    
    # Initialize without backend first (for bootstrap)
    terraform init -backend=false
    
    # Create a minimal main.tf for backend resources if it doesn't exist
    if [[ ! -f "backend-bootstrap.tf" ]]; then
        cat > "backend-bootstrap.tf" << EOF
# Bootstrap configuration for Terraform backend
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "$AWS_REGION"
}

# This file is used only for initial backend setup
# After backend is configured, this file can be removed
EOF
    fi
    
    # Apply to ensure backend resources exist
    terraform plan -out=backend-bootstrap.tfplan
    terraform apply backend-bootstrap.tfplan
    rm -f backend-bootstrap.tfplan
    
    # Now initialize with backend
    terraform init \
        -backend-config="bucket=${bucket_name}" \
        -backend-config="key=${ENVIRONMENT}/terraform.tfstate" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="encrypt=true" \
        -backend-config="dynamodb_table=${table_name}"
    
    # Remove bootstrap file
    rm -f backend-bootstrap.tf
    
    log_success "Terraform initialized with backend"
}

# Function to validate backend setup
validate_backend() {
    local bucket_name="$1"
    local table_name="$2"
    
    log_info "Validating backend setup..."
    
    # Test S3 access
    if aws s3 ls "s3://$bucket_name" &>/dev/null; then
        log_success "S3 bucket access validated"
    else
        log_error "Cannot access S3 bucket: $bucket_name"
        exit 1
    fi
    
    # Test DynamoDB access
    if aws dynamodb describe-table --table-name "$table_name" --region "$AWS_REGION" &>/dev/null; then
        log_success "DynamoDB table access validated"
    else
        log_error "Cannot access DynamoDB table: $table_name"
        exit 1
    fi
    
    # Test Terraform state
    cd "$INFRASTRUCTURE_DIR"
    if terraform state list &>/dev/null; then
        log_success "Terraform backend validated"
    else
        log_error "Terraform backend validation failed"
        exit 1
    fi
}

# Function to create IAM resources for CI/CD
create_cicd_resources() {
    local bucket_name="$1"
    local table_name="$2"
    
    log_info "Creating IAM resources for CI/CD..."
    
    # Create IAM policy for Terraform operations
    local policy_name="${PROJECT_NAME}-terraform-cicd-${ENVIRONMENT}"
    
    cat > /tmp/terraform-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::${bucket_name}",
                "arn:aws:s3:::${bucket_name}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:${AWS_REGION}:*:table/${table_name}"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "eks:*",
                "iam:*",
                "elasticache:*",
                "elasticloadbalancing:*",
                "autoscaling:*",
                "cloudwatch:*",
                "logs:*",
                "route53:*",
                "kms:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    # Create or update the policy
    if aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/${policy_name}" &>/dev/null; then
        aws iam create-policy-version \
            --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/${policy_name}" \
            --policy-document file:///tmp/terraform-policy.json \
            --set-as-default
    else
        aws iam create-policy \
            --policy-name "${policy_name}" \
            --policy-document file:///tmp/terraform-policy.json
    fi
    
    rm -f /tmp/terraform-policy.json
    
    log_success "IAM resources created for CI/CD"
}

# Function to output configuration information
output_configuration() {
    local bucket_name="$1"
    local table_name="$2"
    
    log_success "Terraform backend setup completed!"
    
    cat << EOF

==================================================
TERRAFORM BACKEND CONFIGURATION
==================================================

Environment: ${ENVIRONMENT}
AWS Region: ${AWS_REGION}

S3 Bucket: ${bucket_name}
DynamoDB Table: ${table_name}

Backend Configuration File:
${INFRASTRUCTURE_DIR}/environments/${ENVIRONMENT}.backend.tfvars

To use this backend in Terraform:
terraform init -backend-config="environments/${ENVIRONMENT}.backend.tfvars"

For CI/CD, set the following secrets:
- TF_STATE_BUCKET: ${bucket_name}
- TF_LOCK_TABLE: ${table_name}

==================================================

EOF
}

# Main function
main() {
    log_info "Setting up Terraform backend for Lanka Platform"
    log_info "Environment: $ENVIRONMENT"
    log_info "AWS Region: $AWS_REGION"
    
    check_prerequisites
    
    # Create backend resources
    bucket_name=$(create_state_bucket)
    table_name=$(create_lock_table)
    
    # Create configuration files
    create_backend_config "$bucket_name" "$table_name"
    
    # Initialize Terraform
    initialize_terraform "$bucket_name" "$table_name"
    
    # Validate setup
    validate_backend "$bucket_name" "$table_name"
    
    # Create CI/CD resources
    create_cicd_resources "$bucket_name" "$table_name"
    
    # Output configuration
    output_configuration "$bucket_name" "$table_name"
}

# Help function
show_help() {
    cat << EOF
Lanka Platform Terraform Backend Setup

This script initializes the Terraform backend infrastructure including:
- S3 bucket for state storage
- DynamoDB table for state locking
- IAM resources for CI/CD
- Backend configuration files

Usage: $0 [ENVIRONMENT]

Arguments:
  ENVIRONMENT    Target environment (dev, staging, prod) [default: dev]

Environment Variables:
  AWS_REGION     AWS region for backend resources [default: us-west-2]

Examples:
  $0              # Setup backend for dev environment
  $0 staging      # Setup backend for staging environment
  AWS_REGION=us-east-1 $0 prod    # Setup backend for prod in us-east-1

EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    "")
        main
        ;;
    *)
        main
        ;;
esac