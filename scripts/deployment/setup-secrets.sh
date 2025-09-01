#!/bin/bash

# Setup Secrets Script for Lanka Platform
# Creates and manages Kubernetes secrets for different environments

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-staging}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_dry_run() {
    echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $1" >&2
}

# Execute command with dry-run support
execute_cmd() {
    local cmd="$1"
    if [[ "$DRY_RUN" == "true" ]]; then
        log_dry_run "$cmd"
        return 0
    else
        eval "$cmd"
    fi
}

# Generate secure password
generate_password() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -hex 64
}

# Base64 encode
base64_encode() {
    echo -n "$1" | base64 -w 0
}

# Create database secrets
create_database_secrets() {
    local env="$1"
    
    log_info "Creating database secrets for $env environment"
    
    # Generate database credentials
    local db_username="lanka_${env}_user"
    local db_password
    db_password=$(generate_password 24)
    local db_name="lanka_${env}"
    
    # Database host varies by environment
    local db_host
    case "$env" in
        "production")
            db_host="lanka-postgres-production.default.svc.cluster.local"
            ;;
        "staging")
            db_host="lanka-postgres-staging.default.svc.cluster.local"
            ;;
        *)
            db_host="localhost"
            ;;
    esac
    
    local database_url="postgresql://${db_username}:${db_password}@${db_host}:5432/${db_name}"
    
    # Create secret manifest
    cat > "/tmp/database-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-database
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: database
type: Opaque
data:
  DB_USERNAME: $(base64_encode "$db_username")
  DB_PASSWORD: $(base64_encode "$db_password")
  DATABASE_URL: $(base64_encode "$database_url")
EOF
    
    execute_cmd "kubectl apply -f /tmp/database-secrets-${env}.yaml"
    
    log_success "Database secrets created for $env"
    
    # Store credentials securely (for manual database setup)
    if [[ "$DRY_RUN" != "true" ]]; then
        echo "Database Credentials for $env:" > "/tmp/db-credentials-${env}.txt"
        echo "Username: $db_username" >> "/tmp/db-credentials-${env}.txt"
        echo "Password: $db_password" >> "/tmp/db-credentials-${env}.txt"
        echo "Database: $db_name" >> "/tmp/db-credentials-${env}.txt"
        echo "URL: $database_url" >> "/tmp/db-credentials-${env}.txt"
        chmod 600 "/tmp/db-credentials-${env}.txt"
        log_info "Database credentials saved to /tmp/db-credentials-${env}.txt"
    fi
}

# Create Redis secrets
create_redis_secrets() {
    local env="$1"
    
    log_info "Creating Redis secrets for $env environment"
    
    local redis_password
    redis_password=$(generate_password 32)
    
    local redis_host
    case "$env" in
        "production")
            redis_host="lanka-redis-production.default.svc.cluster.local"
            ;;
        "staging")
            redis_host="lanka-redis-staging.default.svc.cluster.local"
            ;;
        *)
            redis_host="localhost"
            ;;
    esac
    
    cat > "/tmp/redis-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-redis
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: redis
type: Opaque
data:
  REDIS_PASSWORD: $(base64_encode "$redis_password")
  REDIS_URL: $(base64_encode "redis://:${redis_password}@${redis_host}:6379")
EOF
    
    execute_cmd "kubectl apply -f /tmp/redis-secrets-${env}.yaml"
    
    log_success "Redis secrets created for $env"
}

# Create JWT secrets
create_jwt_secrets() {
    local env="$1"
    
    log_info "Creating JWT secrets for $env environment"
    
    local jwt_secret
    jwt_secret=$(generate_jwt_secret)
    local jwt_refresh_secret
    jwt_refresh_secret=$(generate_jwt_secret)
    
    cat > "/tmp/jwt-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-jwt
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: auth
type: Opaque
data:
  JWT_SECRET: $(base64_encode "$jwt_secret")
  JWT_REFRESH_SECRET: $(base64_encode "$jwt_refresh_secret")
EOF
    
    execute_cmd "kubectl apply -f /tmp/jwt-secrets-${env}.yaml"
    
    log_success "JWT secrets created for $env"
}

# Create encryption secrets
create_encryption_secrets() {
    local env="$1"
    
    log_info "Creating encryption secrets for $env environment"
    
    local encryption_key
    encryption_key=$(generate_password 32)
    local session_secret
    session_secret=$(generate_password 32)
    
    cat > "/tmp/encryption-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-encryption
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: security
type: Opaque
data:
  ENCRYPTION_KEY: $(base64_encode "$encryption_key")
  SESSION_SECRET: $(base64_encode "$session_secret")
EOF
    
    execute_cmd "kubectl apply -f /tmp/encryption-secrets-${env}.yaml"
    
    log_success "Encryption secrets created for $env"
}

# Create external service secrets (templates)
create_external_secrets() {
    local env="$1"
    
    log_info "Creating external service secrets for $env environment"
    
    # Note: These are placeholders and should be updated with real values
    local stripe_key="sk_test_placeholder_replace_with_real_key"
    local sendgrid_key="SG.placeholder_replace_with_real_key"
    local twilio_token="placeholder_replace_with_real_token"
    local twilio_sid="AC1234567890abcdef"
    local aws_access_key="AKIA_PLACEHOLDER"
    local aws_secret_key="placeholder_replace_with_real_key"
    local sentry_dsn="https://placeholder@sentry.io/project"
    
    # Adjust for environment
    if [[ "$env" == "production" ]]; then
        stripe_key="sk_live_placeholder_replace_with_real_key"
    fi
    
    cat > "/tmp/external-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-external
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: external-services
  annotations:
    kubernetes.io/managed-by: "lanka-deployment-scripts"
    lanka.com/requires-manual-update: "true"
type: Opaque
data:
  STRIPE_SECRET_KEY: $(base64_encode "$stripe_key")
  STRIPE_WEBHOOK_SECRET: $(base64_encode "whsec_placeholder")
  SENDGRID_API_KEY: $(base64_encode "$sendgrid_key")
  TWILIO_AUTH_TOKEN: $(base64_encode "$twilio_token")
  TWILIO_ACCOUNT_SID: $(base64_encode "$twilio_sid")
  AWS_ACCESS_KEY_ID: $(base64_encode "$aws_access_key")
  AWS_SECRET_ACCESS_KEY: $(base64_encode "$aws_secret_key")
  SENTRY_DSN: $(base64_encode "$sentry_dsn")
EOF
    
    execute_cmd "kubectl apply -f /tmp/external-secrets-${env}.yaml"
    
    log_warning "External service secrets created with placeholder values"
    log_warning "Please update these secrets with real values before going live!"
}

# Combine all secrets into main secret
create_main_secrets() {
    local env="$1"
    
    log_info "Creating main secrets for $env environment"
    
    # Generate all the secrets
    local db_username="lanka_${env}_user"
    local db_password
    db_password=$(generate_password 24)
    local redis_password
    redis_password=$(generate_password 32)
    local jwt_secret
    jwt_secret=$(generate_jwt_secret)
    local jwt_refresh_secret
    jwt_refresh_secret=$(generate_jwt_secret)
    local encryption_key
    encryption_key=$(generate_password 32)
    local session_secret
    session_secret=$(generate_password 32)
    
    # Database URL
    local db_host
    case "$env" in
        "production")
            db_host="lanka-postgres-production.default.svc.cluster.local"
            ;;
        "staging")
            db_host="lanka-postgres-staging.default.svc.cluster.local"
            ;;
        *)
            db_host="localhost"
            ;;
    esac
    
    local database_url="postgresql://${db_username}:${db_password}@${db_host}:5432/lanka_${env}"
    
    cat > "/tmp/main-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-secrets
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
  annotations:
    kubernetes.io/managed-by: "lanka-deployment-scripts"
    lanka.com/created-at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
type: Opaque
data:
  # Database
  DB_USERNAME: $(base64_encode "$db_username")
  DB_PASSWORD: $(base64_encode "$db_password")
  DATABASE_URL: $(base64_encode "$database_url")
  
  # Redis
  REDIS_PASSWORD: $(base64_encode "$redis_password")
  
  # JWT
  JWT_SECRET: $(base64_encode "$jwt_secret")
  JWT_REFRESH_SECRET: $(base64_encode "$jwt_refresh_secret")
  
  # Encryption
  ENCRYPTION_KEY: $(base64_encode "$encryption_key")
  SESSION_SECRET: $(base64_encode "$session_secret")
  
  # External Services (PLACEHOLDERS - UPDATE WITH REAL VALUES)
  STRIPE_SECRET_KEY: $(base64_encode "sk_${env}_placeholder")
  STRIPE_WEBHOOK_SECRET: $(base64_encode "whsec_placeholder")
  SENDGRID_API_KEY: $(base64_encode "SG.placeholder")
  TWILIO_AUTH_TOKEN: $(base64_encode "placeholder")
  TWILIO_ACCOUNT_SID: $(base64_encode "AC1234567890abcdef")
  AWS_ACCESS_KEY_ID: $(base64_encode "AKIA_PLACEHOLDER")
  AWS_SECRET_ACCESS_KEY: $(base64_encode "placeholder")
  SENTRY_DSN: $(base64_encode "https://placeholder@sentry.io/project")
EOF
    
    execute_cmd "kubectl apply -f /tmp/main-secrets-${env}.yaml"
    
    log_success "Main secrets created for $env environment"
    
    # Create credentials file for reference
    if [[ "$DRY_RUN" != "true" ]]; then
        cat > "/tmp/credentials-${env}.txt" << EOF
Lanka Platform Credentials - ${env} Environment
Generated on: $(date)

WARNING: Keep this file secure and delete after use!

Database:
  Username: $db_username
  Password: $db_password
  Database: lanka_${env}
  URL: $database_url

Redis:
  Password: $redis_password

JWT:
  Secret: $jwt_secret
  Refresh Secret: $jwt_refresh_secret

Encryption:
  Key: $encryption_key
  Session Secret: $session_secret

IMPORTANT: External service secrets contain placeholder values.
Update the following secrets with real values:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SENDGRID_API_KEY
- TWILIO_AUTH_TOKEN
- TWILIO_ACCOUNT_SID
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- SENTRY_DSN

Use this command to update a secret:
kubectl patch secret lanka-${env}-secrets -n ${env} -p='{"data":{"SECRET_NAME":"'$(echo -n "new_value" | base64 -w 0)'"}}'
EOF
        
        chmod 600 "/tmp/credentials-${env}.txt"
        log_info "Credentials saved to /tmp/credentials-${env}.txt"
    fi
}

# Backup existing secrets
backup_secrets() {
    local env="$1"
    
    if kubectl get secret "lanka-${env}-secrets" -n "$env" &>/dev/null; then
        log_info "Backing up existing secrets"
        execute_cmd "kubectl get secret lanka-${env}-secrets -n $env -o yaml > /tmp/secrets-backup-${env}-$(date +%Y%m%d-%H%M%S).yaml"
        log_success "Secrets backed up"
    fi
}

# Create TLS secrets
create_tls_secrets() {
    local env="$1"
    
    log_info "Creating TLS certificate placeholders for $env environment"
    
    local domain
    case "$env" in
        "production")
            domain="lanka.com"
            ;;
        "staging")
            domain="staging.lanka.com"
            ;;
        *)
            domain="dev.lanka.com"
            ;;
    esac
    
    # Create self-signed certificate for development/testing
    # In production, cert-manager will handle this
    if ! command -v openssl &> /dev/null; then
        log_warning "OpenSSL not available, skipping TLS certificate creation"
        return 0
    fi
    
    # Generate private key
    openssl genrsa -out "/tmp/${domain}.key" 2048
    
    # Generate certificate
    openssl req -new -x509 -key "/tmp/${domain}.key" -out "/tmp/${domain}.crt" -days 365 -subj "/CN=${domain}"
    
    cat > "/tmp/tls-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-tls
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: tls
  annotations:
    kubernetes.io/managed-by: "lanka-deployment-scripts"
    cert-manager.io/issuer: "letsencrypt-prod"
type: kubernetes.io/tls
data:
  tls.crt: $(base64 -w 0 < "/tmp/${domain}.crt")
  tls.key: $(base64 -w 0 < "/tmp/${domain}.key")
EOF
    
    execute_cmd "kubectl apply -f /tmp/tls-secrets-${env}.yaml"
    
    # Cleanup temporary files
    rm -f "/tmp/${domain}.key" "/tmp/${domain}.crt"
    
    log_success "TLS secrets created for $env (self-signed for development)"
    log_info "In production, cert-manager will replace this with a real certificate"
}

# Validate environment
validate_environment() {
    local env="$1"
    
    case "$env" in
        "development"|"staging"|"production")
            log_info "Valid environment: $env"
            ;;
        *)
            log_error "Invalid environment: $env"
            log_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
    
    # Check if namespace exists
    if ! kubectl get namespace "$env" &>/dev/null; then
        log_warning "Namespace '$env' does not exist, creating it"
        execute_cmd "kubectl create namespace $env"
    fi
}

# Create monitoring secrets
create_monitoring_secrets() {
    local env="$1"
    
    log_info "Creating monitoring secrets for $env environment"
    
    local prometheus_password
    prometheus_password=$(generate_password 16)
    local grafana_password
    grafana_password=$(generate_password 16)
    
    cat > "/tmp/monitoring-secrets-${env}.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lanka-${env}-monitoring
  namespace: ${env}
  labels:
    app: lanka-api
    environment: ${env}
    component: monitoring
type: Opaque
data:
  PROMETHEUS_PASSWORD: $(base64_encode "$prometheus_password")
  GRAFANA_PASSWORD: $(base64_encode "$grafana_password")
EOF
    
    execute_cmd "kubectl apply -f /tmp/monitoring-secrets-${env}.yaml"
    
    log_success "Monitoring secrets created for $env"
}

# Show usage
show_usage() {
    cat << EOF
Lanka Platform Secrets Setup Script

Usage: $0 <environment>

Arguments:
  environment     Target environment (development|staging|production)

Environment Variables:
  DRY_RUN        Set to 'true' to show what would be done (default: false)

Examples:
  # Setup secrets for staging
  $0 staging

  # Setup secrets for production
  $0 production

  # Dry run to see what would be created
  DRY_RUN=true $0 production

Note: This script generates secure random passwords and keys.
External service secrets (Stripe, SendGrid, etc.) are created with
placeholder values and must be updated manually with real credentials.
EOF
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files"
    rm -f /tmp/*-secrets-*.yaml /tmp/*.crt /tmp/*.key
}

# Main function
main() {
    local env="$1"
    
    log_info "🔐 Setting up secrets for Lanka Platform"
    log_info "Environment: $env"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Validate environment
    validate_environment "$env"
    
    # Backup existing secrets
    backup_secrets "$env"
    
    # Create all secrets
    create_main_secrets "$env"
    create_tls_secrets "$env"
    create_monitoring_secrets "$env"
    
    log_success "🎉 Secrets setup completed for $env environment"
    log_warning "⚠️  Remember to update external service secrets with real values!"
    log_info "📋 Credentials file created at /tmp/credentials-${env}.txt"
    log_info "🔒 Keep credentials secure and delete the file after use"
    
    # Show next steps
    cat << EOF

Next Steps:
1. Update external service secrets with real values:
   kubectl patch secret lanka-${env}-secrets -n ${env} \\
     -p='{"data":{"STRIPE_SECRET_KEY":"'$(echo -n "real_stripe_key" | base64 -w 0)'"}}'

2. Verify secrets are created:
   kubectl get secrets -n ${env}

3. Test application with new secrets:
   kubectl rollout restart deployment/lanka-api-blue -n ${env}

4. Delete credentials file when done:
   rm /tmp/credentials-${env}.txt
EOF
}

# Handle help flag
if [[ $# -eq 0 ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_usage
    exit 0
fi

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"