# 📚 LANKA Documentation

Welcome to the LANKA project documentation. This directory contains all essential documentation for developers, users, and contributors.

## 📁 Documentation Structure

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [developer-setup-guide.md](./developer-setup-guide.md) | **Environment setup guide** for Windows 11 + Docker Desktop + WSL2 | New developers |
| [developer-workflow-guide.md](./developer-workflow-guide.md) | **Git workflow and standards** inspired by Linux kernel practices | All developers |
| [developer-guide.md](./developer-guide.md) | **Technical overview** of the LANKA system architecture | Developers |
| [user-guide.md](./user-guide.md) | **End-user documentation** for using LANKA | End users |
| [architecture.md](./architecture.md) | **System architecture** deep dive | Architects, senior devs |
| [planning.md](./planning.md) | **Project planning** and roadmap | Project managers, leads |

### API Documentation

Located in [`api/`](./api/) directory:

- **[README.md](./api/README.md)** - API overview and quick start
- **[authentication.md](./api/authentication.md)** - Authentication and authorization
- **[graphql-schema.md](./api/graphql-schema.md)** - GraphQL schema documentation
- **[openapi.yaml](./api/openapi.yaml)** - OpenAPI/Swagger specification
- **[error-handling.md](./api/error-handling.md)** - Error codes and handling
- **[rate-limiting.md](./api/rate-limiting.md)** - Rate limiting policies
- **[integration-guide.md](./api/integration-guide.md)** - Third-party integration guide
- **[testing-guide.md](./api/testing-guide.md)** - API testing guide
- **[postman-collection.json](./api/postman-collection.json)** - Postman collection for testing

### Testing Documentation

Located in [`testing/`](./testing/) directory:

- **[integration-testing-guide.md](./testing/integration-testing-guide.md)** - Integration testing strategies
- **[test-coverage-report.md](./testing/test-coverage-report.md)** - Current test coverage metrics

## 🚀 Quick Start for New Developers

1. **Setup Environment**: Start with [developer-setup-guide.md](./developer-setup-guide.md)
2. **Learn Workflow**: Read [developer-workflow-guide.md](./developer-workflow-guide.md) 
3. **Understand Architecture**: Review [developer-guide.md](./developer-guide.md)
4. **Explore APIs**: Check [`api/README.md`](./api/README.md)

## 📋 Documentation Standards

All documentation in this project follows these standards:

### Naming Convention
- **Format**: All lowercase with hyphens (kebab-case)
- **Examples**: `developer-guide.md`, `api-reference.md`, `test-coverage-report.md`
- **No underscores or uppercase**: Avoid `DEVELOPER_GUIDE.md` or `developer_guide.md`

### Content Standards
- **Format**: Markdown (`.md`) files
- **Structure**: Clear hierarchy with table of contents
- **Code Examples**: Include working examples where applicable
- **Versioning**: Keep documentation in sync with code versions
- **Review**: Documentation changes require review like code

## 🔄 Keeping Documentation Updated

When making changes:

1. **Code Changes**: Update relevant documentation
2. **New Features**: Add to user-guide.md and API docs
3. **Architecture Changes**: Update architecture.md
4. **Workflow Changes**: Update developer-workflow-guide.md
5. **Breaking Changes**: Clearly mark in documentation

## 📦 Archived Documentation

Historical and outdated documentation has been moved to the [`archive/`](./archive/) directory:

- `claude-sessions/` - AI assistant session logs
- `migration-reports/` - Database migration reports
- `old-guides/` - Superseded documentation
- `phase-summaries/` - Project phase summaries

These are kept for reference but are no longer actively maintained.

## 🤝 Contributing to Documentation

1. Follow the standards in [developer-workflow-guide.md](./developer-workflow-guide.md)
2. Use clear, concise language
3. Include examples and diagrams where helpful
4. Test all code examples
5. Update the table of contents
6. Submit PR with `docs:` prefix

## 📞 Getting Help

- **Questions**: Check existing documentation first
- **Issues**: Report documentation issues on GitHub
- **Improvements**: Submit PRs for documentation improvements
- **Support**: Contact the documentation maintainer (see [MAINTAINERS.md](../MAINTAINERS.md))

---

**Last Updated**: January 2025  
**Maintained by**: LANKA Documentation Team