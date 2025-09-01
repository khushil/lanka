# Secrets Management Guide

## Overview

This document outlines the security practices implemented in Lanka Platform for managing sensitive configuration data, passwords, and API keys. All hardcoded secrets have been eliminated and replaced with secure environment-based configuration.

## 🔐 Security Principles

### 1. No Hardcoded Secrets
- **Never** commit passwords, API keys, or other secrets to version control
- All sensitive configuration must use environment variables
- Required secrets must fail application startup if missing

### 2. Environment-Based Configuration
- All configuration loaded from environment variables
- Validation ensures required secrets are present
- Separate configuration for development, staging, and production

### 3. Fail-Fast Security
- Application exits immediately if required secrets are missing
- Comprehensive validation before service initialization
- Clear error messages guide proper configuration

## 🛡️ Implementation Details

### Environment Validation System

The `environment-validator.ts` script provides:
- **Startup Validation**: Validates all required environment variables
- **Security Checks**: Detects weak passwords and common security issues
- **Service Connectivity**: Tests database and service connections
- **Production Safety**: Enhanced security checks for production deployment

### Required Environment Variables

```bash
# Database Authentication - REQUIRED
NEO4J_PASSWORD=your-secure-password-here
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
API_KEY_SECRET=your-api-key-secret-at-least-32-characters-long
```

### Optional Environment Variables

```bash
# Database Configuration
MONGODB_PASSWORD=your-mongodb-password
REDIS_PASSWORD=your-redis-password
ELASTICSEARCH_PASSWORD=your-elasticsearch-password

# External Services
OPENAI_API_KEY=sk-your-api-key-here
```

## 🚀 Quick Setup

### Development Environment

1. **Copy Environment Template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Set Required Secrets**:
   ```bash
   # Generate secure passwords
   openssl rand -base64 32  # For NEO4J_PASSWORD
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For API_KEY_SECRET
   ```

3. **Validate Configuration**:
   ```bash
   npm run validate:env
   ```

4. **Start Services**:
   ```bash
   docker-compose up -d
   ```

### Production Deployment

#### Using Docker Secrets

1. **Create Docker Secrets**:
   ```bash
   echo "your-neo4j-password" | docker secret create neo4j_password -
   echo "your-mongodb-password" | docker secret create mongodb_password -
   echo "your-redis-password" | docker secret create redis_password -
   ```

2. **Deploy with Secrets**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

#### Using Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lanka-secrets
type: Opaque
data:
  neo4j-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-jwt-secret>
  api-key-secret: <base64-encoded-api-key-secret>
```

## 🔍 Security Validation

### Automatic Checks

The environment validator performs these security checks:

1. **Password Strength**: Ensures production passwords meet minimum length requirements
2. **Default Password Detection**: Warns about common/default passwords
3. **Secret Exposure**: Checks for accidentally exposed secrets in environment
4. **Service Connectivity**: Validates database connections (development only)

### Manual Security Audit

Run comprehensive security check:
```bash
npm run security:audit
```

Check environment status:
```bash
npm run env:check
```

## 📋 Migration Checklist

### Phase 1.2 Remediation Complete ✅

- [x] **Neo4j Password**: Removed `lanka2025` fallback, requires `NEO4J_PASSWORD`
- [x] **Docker Compose**: Replaced all hardcoded passwords with environment variables
- [x] **Environment Template**: Created comprehensive `.env.example`
- [x] **Startup Validation**: Implemented fail-fast environment checking
- [x] **Docker Secrets**: Added support for Docker secrets in production
- [x] **Health Checks**: Added service health monitoring in Docker Compose

## 🛠️ Development Commands

```bash
# Environment validation
npm run validate:env           # Validate environment setup
npm run env:check             # Show environment status
npm run env:status            # Detailed environment report

# Security commands
npm run security:audit        # Run security audit
npm run security:scan         # Scan for hardcoded secrets
npm run test:security         # Run security test suite
```

## 🔧 Configuration Files

### Key Files Modified

- `/src/core/database/neo4j.ts` - Removed hardcoded password fallback
- `/docker-compose.yml` - Added environment variable support and health checks
- `/src/core/config/environment.ts` - Centralized configuration management
- `/src/startup/environment-validator.ts` - Startup validation system
- `/.env.example` - Comprehensive environment template

### Environment Structure

```
/lanka/
├── .env.example              # Environment template (committed)
├── .env.local               # Local development config (ignored)
├── .env.production          # Production config (ignored)
├── docker-compose.yml       # Base Docker configuration
└── docker-compose.prod.yml  # Production overrides
```

## ⚠️ Important Security Notes

### DO NOT Commit:
- `.env.local` or `.env` files
- Any file containing actual passwords or API keys
- Configuration with hardcoded secrets

### ALWAYS:
- Use environment variables for all secrets
- Validate configuration before startup
- Use strong, unique passwords for each service
- Rotate secrets regularly in production
- Monitor for exposed secrets in logs

### Production Requirements:
- JWT secrets must be at least 32 characters
- Database passwords must be unique and strong
- Use Docker secrets or Kubernetes secrets for deployment
- Enable security monitoring and alerting
- Regular security audits and penetration testing

## 🆘 Troubleshooting

### Common Issues

**Error: "NEO4J_PASSWORD environment variable is required"**
```bash
# Solution: Set the environment variable
export NEO4J_PASSWORD="your-secure-password-here"
```

**Error: "Environment validation failed"**
```bash
# Solution: Run environment check to see what's missing
npm run env:check
```

**Docker services won't start**
```bash
# Solution: Check environment variables are set
docker-compose config  # Verify configuration
```

### Getting Help

1. Check environment status: `npm run env:check`
2. Validate configuration: `npm run validate:env`
3. Review logs for specific error messages
4. Ensure all required services are running
5. Verify network connectivity and firewall settings

## 📚 Additional Resources

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Kubernetes Secrets Guide](https://kubernetes.io/docs/concepts/configuration/secret/)
- [OWASP Secret Management](https://owasp.org/www-project-secrets-management/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Security Contact**: If you discover any security vulnerabilities, please report them immediately to the security team.