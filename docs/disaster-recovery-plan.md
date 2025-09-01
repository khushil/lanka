# Lanka Platform Disaster Recovery Plan

## Overview

This document outlines the disaster recovery (DR) procedures for the Lanka Platform, including infrastructure restoration, data recovery, and business continuity measures. The plan is designed to minimize downtime and ensure rapid recovery from various failure scenarios.

## Recovery Time and Point Objectives

| Component | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|-----------|-------------------------------|--------------------------------|
| Application Services | 30 minutes | 15 minutes |
| Neo4j Database | 1 hour | 1 hour |
| Redis Cache | 15 minutes | N/A (cache rebuilt) |
| Infrastructure | 2 hours | N/A (IaC deployment) |
| Overall System | 2 hours | 1 hour |

## Disaster Scenarios

### 1. Single AZ Failure
- **Impact**: Partial service degradation
- **Recovery**: Automatic failover to healthy AZs
- **RTO**: < 5 minutes
- **RPO**: Near-zero (real-time replication)

### 2. Regional Failure
- **Impact**: Complete service outage
- **Recovery**: Manual failover to DR region
- **RTO**: 2 hours
- **RPO**: 1 hour

### 3. Database Corruption
- **Impact**: Data integrity issues
- **Recovery**: Database restore from backup
- **RTO**: 1 hour
- **RPO**: Up to 1 hour

### 4. Application Failure
- **Impact**: Service unavailable
- **Recovery**: Redeploy from last known good state
- **RTO**: 30 minutes
- **RPO**: Near-zero

## Backup Strategy

### 1. Database Backups

#### Neo4j Backups
- **Frequency**: Daily full backups, hourly incremental
- **Retention**: 30 days local, 90 days cross-region
- **Location**: S3 buckets with cross-region replication
- **Encryption**: AES-256 with KMS keys

```bash
# Manual backup command
kubectl exec -n lanka-platform deployment/neo4j -- neo4j-admin backup \
  --backup-dir=/backups --name=neo4j-backup-$(date +%Y%m%d-%H%M%S)

# Automated backup via CronJob
kubectl apply -f k8s/cronjobs/neo4j-backup.yaml
```

#### Redis Backups
- **Frequency**: RDB snapshots every 6 hours
- **Retention**: 7 days
- **Location**: ElastiCache automated backups
- **Notes**: Cache can be rebuilt from primary data sources

### 2. Configuration Backups

#### Kubernetes Resources
- **Frequency**: Before each deployment
- **Method**: GitOps with ArgoCD
- **Location**: Git repository with GitHub Actions backup

```bash
# Backup all K8s resources
kubectl get all,configmap,secret,pvc,ingress -o yaml > \
  backups/k8s-backup-$(date +%Y%m%d-%H%M%S).yaml
```

#### Infrastructure State
- **Frequency**: After each Terraform apply
- **Method**: Terraform state file backups
- **Location**: S3 with versioning and cross-region replication

### 3. Application Data Backups

#### Code and Assets
- **Method**: Git repository with multiple remotes
- **Frequency**: Real-time (on commit)
- **Locations**: GitHub, GitLab, AWS CodeCommit

#### Docker Images
- **Method**: Multi-region ECR replication
- **Retention**: 30 days for all images
- **Locations**: Primary and DR regions

## Recovery Procedures

### 1. Infrastructure Recovery

#### Prerequisites
- AWS CLI configured with appropriate permissions
- Terraform installed (version 1.5+)
- kubectl configured
- Backup data accessible

#### Step-by-Step Recovery

1. **Initialize DR Region Infrastructure**
```bash
cd infrastructure/

# Switch to DR region
export AWS_REGION=us-east-1

# Initialize Terraform for DR
terraform init -backend-config="key=prod-dr/terraform.tfstate"

# Deploy infrastructure
terraform apply -var-file="environments/prod-dr.tfvars"
```

2. **Deploy Kubernetes Cluster**
```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name lanka-platform-prod-dr

# Deploy base resources
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/secrets.yaml
```

3. **Restore Databases**
```bash
# Restore Neo4j from backup
kubectl apply -f k8s/jobs/neo4j-restore.yaml

# Wait for Neo4j to be ready
kubectl wait --for=condition=Ready pod -l app=neo4j -n lanka-platform --timeout=600s

# Redis will be rebuilt from application startup
```

4. **Deploy Applications**
```bash
# Deploy applications
kubectl apply -k k8s/overlays/prod-dr/

# Verify deployment
kubectl rollout status deployment/lanka-platform-api -n lanka-platform
```

### 2. Database Recovery

#### Neo4j Recovery from Backup

1. **Stop running Neo4j instance**
```bash
kubectl scale deployment/neo4j -n lanka-platform --replicas=0
```

2. **Restore from S3 backup**
```bash
# Create restore job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: neo4j-restore-$(date +%s)
  namespace: lanka-platform
spec:
  template:
    spec:
      containers:
      - name: restore
        image: neo4j:5.14.0-enterprise
        command: 
        - /bin/bash
        - -c
        - |
          # Download latest backup from S3
          aws s3 cp s3://lanka-platform-backups/neo4j/latest.tar.gz /tmp/
          
          # Extract and restore
          tar -xzf /tmp/latest.tar.gz -C /var/lib/neo4j/
          
          # Set permissions
          chown -R neo4j:neo4j /var/lib/neo4j/data
        volumeMounts:
        - name: neo4j-data
          mountPath: /var/lib/neo4j/data
      volumes:
      - name: neo4j-data
        persistentVolumeClaim:
          claimName: neo4j-data
      restartPolicy: Never
EOF
```

3. **Restart Neo4j**
```bash
kubectl scale deployment/neo4j -n lanka-platform --replicas=1
```

#### Point-in-Time Recovery

For more granular recovery, use Neo4j transaction logs:

```bash
# Restore to specific point in time
neo4j-admin restore --from=/backups/incremental-backup-20231201-120000 \
  --database=neo4j --force
```

### 3. Application Recovery

#### Rollback to Previous Version

1. **Identify last known good version**
```bash
# Check deployment history
kubectl rollout history deployment/lanka-platform-api -n lanka-platform
```

2. **Rollback deployment**
```bash
# Rollback to previous version
kubectl rollout undo deployment/lanka-platform-api -n lanka-platform

# Or rollback to specific revision
kubectl rollout undo deployment/lanka-platform-api -n lanka-platform --to-revision=5
```

#### Complete Application Redeployment

```bash
# Deploy from GitOps
./scripts/deploy.sh prod rolling

# Or manual deployment
kubectl apply -k k8s/overlays/prod/
```

## Monitoring and Alerting

### Health Checks

Continuous monitoring to detect failures:

```yaml
# Health check endpoints
- Application: https://api.lanka-platform.com/health
- Database: kubectl exec -n lanka-platform deployment/neo4j -- cypher-shell "MATCH (n) RETURN count(n) LIMIT 1"
- Cache: kubectl exec -n lanka-platform deployment/redis -- redis-cli ping
```

### Automated Alerts

Configure alerts for:
- Service unavailability
- Database connection failures
- High error rates
- Infrastructure anomalies

### Failover Triggers

Automatic failover conditions:
- Regional AWS service outages
- Database unavailability > 5 minutes
- Application error rate > 50% for 5 minutes

## Testing and Validation

### DR Testing Schedule

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Backup restoration | Monthly | Database backups |
| Application failover | Quarterly | Cross-AZ failover |
| Full DR drill | Semi-annually | Complete region failover |
| Chaos engineering | Continuous | Random failure injection |

### Test Procedures

#### Monthly Backup Test
```bash
# Automated test script
./scripts/test-backup-restore.sh

# Manual validation
kubectl exec -n lanka-platform deployment/neo4j-test -- \
  cypher-shell "MATCH (n) RETURN count(n)"
```

#### Quarterly Failover Test
```bash
# Simulate AZ failure
kubectl cordon node-in-az-1a
kubectl cordon node-in-az-1b

# Verify application remains available
curl -f https://api.lanka-platform.com/health
```

### Chaos Engineering

Use Chaos Monkey or Litmus for regular failure injection:

```yaml
# Example chaos experiment
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosExperiment
metadata:
  name: pod-delete
spec:
  definition:
    scope: Namespaced
    permissions:
      - apiGroups: [""]
        resources: ["pods"]
        verbs: ["get", "list", "delete"]
```

## Communication Plan

### Incident Response Team

| Role | Primary | Secondary |
|------|---------|-----------|
| Incident Commander | DevOps Lead | Platform Architect |
| Technical Lead | Senior Developer | Database Admin |
| Communications | Product Manager | Support Manager |

### Communication Channels

- **Internal**: Slack #incidents channel
- **External**: Status page (status.lanka-platform.com)
- **Stakeholders**: Email distribution list
- **Customers**: In-app notifications

### Status Page Updates

Automated status updates based on health checks:

```bash
# Update status page via API
curl -X POST "https://api.statuspage.io/v1/pages/PAGE_ID/incidents" \
  -H "Authorization: OAuth TOKEN" \
  -d '{
    "incident": {
      "name": "Service Degradation",
      "status": "investigating",
      "impact_override": "minor"
    }
  }'
```

## Recovery Validation

### Post-Recovery Checklist

- [ ] All services responding to health checks
- [ ] Database queries returning expected results
- [ ] Application functionality verified
- [ ] Performance metrics within normal ranges
- [ ] Monitoring and alerting operational
- [ ] Backup processes resumed
- [ ] Security controls verified
- [ ] Customer notifications sent (if applicable)

### Performance Validation

```bash
# Automated validation script
./scripts/validate-recovery.sh

# Manual checks
curl -f https://api.lanka-platform.com/health
kubectl get pods -n lanka-platform
kubectl top nodes
```

## Continuous Improvement

### Post-Incident Review

After each incident or DR test:

1. Document timeline of events
2. Identify root causes
3. Review response effectiveness
4. Update procedures as needed
5. Schedule follow-up actions

### Metrics Tracking

- Mean Time to Detection (MTTD)
- Mean Time to Resolution (MTTR)
- Recovery Time Objective compliance
- Recovery Point Objective compliance
- Test success rates

### Documentation Updates

Maintain current documentation:
- Update procedures after each change
- Review and validate quarterly
- Training updates for team members
- Version control all documentation

## Emergency Contacts

### Internal Team
- On-call Engineer: +1-xxx-xxx-xxxx
- DevOps Lead: +1-xxx-xxx-xxxx
- CTO: +1-xxx-xxx-xxxx

### External Vendors
- AWS Support: Enterprise Support Case
- Database Vendor: Priority Support
- Monitoring Service: Emergency Contact

### Escalation Procedures

1. **Level 1**: On-call engineer (0-15 minutes)
2. **Level 2**: DevOps lead (15-30 minutes)
3. **Level 3**: Architecture team (30-60 minutes)
4. **Level 4**: Executive team (1+ hours)

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01  
**Owner**: DevOps Team