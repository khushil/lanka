# LANKA Maintainers

This file lists the maintainers for different subsystems of the LANKA project. Each subsystem has a designated maintainer and backup who are responsible for code reviews, design decisions, and maintaining quality standards.

## Maintainer Responsibilities

1. **Code Review**: Review all PRs touching their subsystem
2. **Design Decisions**: Approve architectural changes in their domain
3. **Quality Gates**: Ensure code meets project standards
4. **Documentation**: Keep subsystem documentation updated
5. **Mentoring**: Guide new contributors
6. **Coordination**: Sync with other maintainers for cross-subsystem changes

## Subsystem Maintainers

### Core System
**Description**: Core system functionality, kernel modules, and system architecture  
**Maintainer**: @[primary-maintainer]  
**Backup**: @[backup-maintainer]  
**Files**:
- `src/core/**`
- `src/kernel/**`
- `src/system/**`

### API Layer
**Description**: REST API endpoints, GraphQL schemas, and API gateway  
**Maintainer**: @[api-lead]  
**Backup**: @[api-backup]  
**Files**:
- `src/api/**`
- `src/graphql/**`
- `src/middleware/**`

### Database Layer
**Description**: Database connections, migrations, and data access layer  
**Maintainer**: @[db-lead]  
**Backup**: @[db-backup]  
**Files**:
- `src/db/**`
- `src/models/**`
- `migrations/**`
- `scripts/db/**`

### Authentication & Security
**Description**: Authentication, authorization, and security features  
**Maintainer**: @[security-lead]  
**Backup**: @[security-backup]  
**Files**:
- `src/auth/**`
- `src/security/**`
- `src/middleware/auth/**`
- `src/crypto/**`

### Graph Intelligence
**Description**: Neo4j integration, graph algorithms, and knowledge graphs  
**Maintainer**: @[graph-lead]  
**Backup**: @[graph-backup]  
**Files**:
- `src/graph/**`
- `src/neo4j/**`
- `src/algorithms/**`

### Machine Learning
**Description**: ML models, training pipelines, and AI features  
**Maintainer**: @[ml-lead]  
**Backup**: @[ml-backup]  
**Files**:
- `src/ml/**`
- `src/ai/**`
- `models/**`
- `training/**`

### Frontend/UI
**Description**: User interface, React components, and client application  
**Maintainer**: @[frontend-lead]  
**Backup**: @[frontend-backup]  
**Files**:
- `client/**`
- `src/components/**`
- `public/**`
- `styles/**`

### DevOps & Infrastructure
**Description**: CI/CD, deployment, monitoring, and infrastructure  
**Maintainer**: @[devops-lead]  
**Backup**: @[devops-backup]  
**Files**:
- `.github/**`
- `docker/**`
- `k8s/**`
- `scripts/**`
- `terraform/**`
- `.circleci/**`

### Testing
**Description**: Test frameworks, test suites, and quality assurance  
**Maintainer**: @[qa-lead]  
**Backup**: @[qa-backup]  
**Files**:
- `tests/**`
- `e2e/**`
- `**/*.test.ts`
- `**/*.spec.ts`

### Documentation
**Description**: Project documentation, API docs, and guides  
**Maintainer**: @[docs-lead]  
**Backup**: @[docs-backup]  
**Files**:
- `docs/**`
- `README.md`
- `**/*.md`
- `examples/**`

## Review Requirements by Subsystem

| Subsystem | Min Reviewers | Must Include | Response Time SLA |
|-----------|--------------|--------------|-------------------|
| Core System | 2 | Maintainer | 24 hours |
| API Layer | 2 | Maintainer or Backup | 24 hours |
| Database | 2 | Maintainer | 24 hours |
| Auth & Security | 2 | Maintainer + Security Team | 12 hours |
| Graph Intelligence | 1 | Maintainer or Backup | 48 hours |
| Machine Learning | 1 | Maintainer or Backup | 48 hours |
| Frontend/UI | 1 | Any Frontend Team Member | 24 hours |
| DevOps | 2 | Maintainer | 24 hours |
| Testing | 1 | QA Team Member | 24 hours |
| Documentation | 1 | Any Maintainer | 72 hours |

## Escalation Path

1. **First Level**: Subsystem Maintainer
2. **Second Level**: Subsystem Backup
3. **Third Level**: Technical Lead
4. **Final Level**: Project Owner

## Becoming a Maintainer

To become a maintainer:

1. **Contribute Regularly**: Make significant contributions to the subsystem
2. **Demonstrate Expertise**: Show deep understanding of the subsystem
3. **Review PRs**: Actively participate in code reviews
4. **Help Others**: Assist other contributors and answer questions
5. **Nomination**: Be nominated by existing maintainer
6. **Approval**: Get approval from technical lead and 2+ maintainers

## Maintainer Rotation

- Maintainers serve for minimum 6 months
- Rotation happens quarterly if needed
- Handover period of 2 weeks for knowledge transfer
- Previous maintainer becomes backup for 1 quarter

## Communication Channels

- **Slack**: #lanka-maintainers (private)
- **Email**: maintainers@lanka-project.org
- **Weekly Sync**: Thursdays 2 PM UTC
- **Emergency**: Use @maintainers-oncall in Slack

## Code of Conduct

All maintainers must:
- Follow the project's Code of Conduct
- Be respectful and professional
- Respond to PRs within SLA
- Provide constructive feedback
- Help grow the community

---

**Last Updated**: January 2025  
**Next Review**: April 2025

To update this file, submit a PR with approval from the Technical Lead.