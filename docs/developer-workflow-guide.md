# 📋 LANKA Developer Workflow Guide

> **Enterprise-grade Git workflow inspired by Linux Kernel development practices**

This guide establishes strict standards for code contribution, branching, commit messages, and release management for the LANKA project. All contributors must follow these guidelines to maintain code quality and project history.

---

## 📑 Table of Contents

1. [Core Principles](#core-principles)
2. [Git Configuration](#git-configuration)
3. [Branch Strategy](#branch-strategy)
4. [Commit Standards](#commit-standards)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Requirements](#code-review-requirements)
7. [Changelog Management](#changelog-management)
8. [Release Process](#release-process)
9. [Subsystem Maintainers](#subsystem-maintainers)
10. [Emergency Procedures](#emergency-procedures)

---

## Core Principles

Following Linux kernel development philosophy:

1. **No Breaking Changes in Stable** - Never break existing functionality
2. **Bisectability** - Every commit must compile and pass tests
3. **Atomic Commits** - One logical change per commit
4. **Clear History** - Commit messages are documentation
5. **Maintainer Hierarchy** - Subsystem maintainers review their domains
6. **Sign-off Required** - All commits must be signed-off

---

## Git Configuration

### Required Git Settings

```bash
# Essential configuration
git config --global user.name "Your Full Name"
git config --global user.email "your.email@company.com"
git config --global core.autocrlf input
git config --global core.eol lf
git config --global pull.rebase true
git config --global fetch.prune true
git config --global diff.colorMoved zebra
git config --global merge.conflictstyle diff3
git config --global commit.verbose true
git config --global help.autocorrect 1
git config --global core.editor "code --wait"  # or vim, nano, etc.

# Sign commits with GPG (required for releases)
git config --global user.signingkey YOUR_GPG_KEY
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# Aliases for common workflows
git config --global alias.st "status -sb"
git config --global alias.co "checkout"
git config --global alias.br "branch -vv"
git config --global alias.lg "log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
git config --global alias.fixup "commit --fixup"
git config --global alias.squash "commit --squash"
git config --global alias.ri "rebase -i --autosquash"
git config --global alias.pushf "push --force-with-lease"
git config --global alias.stash-all "stash save --include-untracked"
git config --global alias.undo "reset --soft HEAD~1"
```

### Git Hooks Setup

Install pre-commit hooks:
```bash
# Install pre-commit framework
pip install pre-commit

# Install hooks for this repository
pre-commit install
pre-commit install --hook-type commit-msg
pre-commit install --hook-type pre-push
```

---

## Branch Strategy

### Branch Types and Naming

```
main                    # Production-ready code (protected)
├── develop            # Integration branch for next release
├── release/v*         # Release preparation branches
├── hotfix/*          # Emergency fixes for production
├── feature/*         # New features
├── bugfix/*          # Bug fixes for develop
├── refactor/*        # Code refactoring
├── test/*            # Test improvements
├── docs/*            # Documentation updates
└── experimental/*    # Experimental features (may be deleted)
```

### Branch Naming Convention

```
type/issue-number-brief-description

Examples:
feature/1234-user-authentication
bugfix/5678-fix-memory-leak
refactor/9012-optimize-database-queries
docs/3456-api-documentation
hotfix/7890-critical-security-patch
```

### Branch Protection Rules

**main branch:**
- No direct pushes
- Requires pull request reviews (minimum 2)
- Requires status checks to pass
- Requires branches to be up to date
- Requires signed commits
- Dismiss stale reviews
- Include administrators in restrictions

**develop branch:**
- No direct pushes
- Requires pull request reviews (minimum 1)
- Requires status checks to pass
- Requires signed commits

---

## Commit Standards

### Commit Message Format

Following the Linux kernel and Conventional Commits specification:

```
<type>(<scope>): <subject> (max 50 chars)

<body> (max 72 chars per line)

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **perf**: Performance improvement
- **refactor**: Code refactoring
- **style**: Code style changes (formatting, etc.)
- **test**: Test additions or modifications
- **docs**: Documentation changes
- **build**: Build system changes
- **ci**: CI/CD configuration changes
- **chore**: Maintenance tasks
- **revert**: Revert a previous commit
- **security**: Security fixes

### Scopes (Subsystems)

- **core**: Core system functionality
- **api**: API endpoints and GraphQL
- **db**: Database layer (Neo4j, MongoDB, etc.)
- **auth**: Authentication and authorization
- **ui**: User interface components
- **cache**: Caching layer
- **queue**: Message queue system
- **ml**: Machine learning components
- **monitoring**: Monitoring and telemetry
- **deployment**: Deployment configurations

### Commit Message Examples

```bash
# Good commit messages
git commit -m "feat(auth): implement OAuth2 authentication flow

- Add OAuth2 provider configuration
- Implement token validation middleware
- Add user session management
- Update authentication documentation

Implements: #1234
Signed-off-by: John Doe <john@example.com>"

git commit -m "fix(db): resolve connection pool exhaustion

The connection pool was not properly releasing connections
after query timeout, leading to pool exhaustion under load.

This commit:
- Adds proper connection cleanup in error handlers
- Implements connection timeout monitoring
- Adds metrics for pool utilization

Fixes: #5678
Reported-by: Jane Smith <jane@example.com>
Tested-by: Bob Johnson <bob@example.com>
Signed-off-by: John Doe <john@example.com>"

git commit -m "perf(api): optimize GraphQL resolver performance

Reduce N+1 queries in user resolver by implementing
DataLoader pattern for batch loading related entities.

Performance improvement:
- Before: 500ms average response time
- After: 50ms average response time
- 90% reduction in database queries

Benchmark results available in tests/performance/

Closes: #9012
Signed-off-by: John Doe <john@example.com>"
```

### Commit Message Rules

1. **Subject line**: 
   - Imperative mood ("add" not "added" or "adds")
   - No period at the end
   - Capitalize first letter
   - Maximum 50 characters

2. **Body**:
   - Separate from subject with blank line
   - Explain what and why, not how
   - Wrap at 72 characters
   - Use bullet points for multiple items

3. **Footer**:
   - Reference issues/tickets
   - Include sign-off
   - Add co-authors if applicable
   - Include breaking changes

### Sign-off Requirement

All commits MUST include a sign-off:
```bash
Signed-off-by: Your Name <your.email@example.com>
```

Use `git commit -s` to automatically add sign-off.

---

## Pull Request Process

### PR Creation

1. **Create feature branch from develop**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/1234-new-feature
```

2. **Make atomic commits**
```bash
# Make changes
git add -p  # Stage changes interactively
git commit -s  # Commit with sign-off
```

3. **Keep branch updated**
```bash
git fetch origin
git rebase origin/develop
```

4. **Push and create PR**
```bash
git push origin feature/1234-new-feature
# Create PR via GitHub/GitLab
```

### PR Title Format

```
[SUBSYSTEM] Brief description (max 50 chars)

Examples:
[API] Add pagination to user endpoints
[DB] Optimize Neo4j query performance
[AUTH] Fix JWT token expiration bug
[DOCS] Update API documentation
```

### PR Description Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Changes Made
- Detailed list of changes
- Include technical decisions
- Explain any trade-offs

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance tests pass
- [ ] Manual testing completed

## Performance Impact
- Database queries: +0 / -5
- API response time: -20%
- Memory usage: No change

## Breaking Changes
List any breaking changes and migration steps

## Related Issues
Fixes #1234
Relates to #5678

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Changelog updated
- [ ] Sign-off included in commits

## Screenshots (if applicable)
Before/After screenshots for UI changes

## Reviewers
@subsystem-maintainer
@team-lead
```

### PR Review Process

1. **Automated Checks** (must pass):
   - CI/CD pipeline
   - Unit tests
   - Integration tests
   - Code coverage (minimum 80%)
   - Linting
   - Security scanning
   - Performance benchmarks

2. **Code Review Requirements**:
   - Minimum 2 approvals for main
   - 1 approval must be from subsystem maintainer
   - No unresolved comments
   - All discussions resolved

3. **Review Checklist**:
   - [ ] Code correctness
   - [ ] Performance implications
   - [ ] Security considerations
   - [ ] Test coverage
   - [ ] Documentation completeness
   - [ ] Backward compatibility
   - [ ] Error handling
   - [ ] Logging adequacy

---

## Code Review Requirements

### Review Standards

Inspired by Linux kernel review process:

1. **Technical Review**:
   - Algorithm correctness
   - Data structure choices
   - Complexity analysis
   - Edge case handling

2. **Architecture Review**:
   - Design patterns
   - SOLID principles
   - Dependency management
   - Module boundaries

3. **Performance Review**:
   - Time complexity
   - Space complexity
   - Database query optimization
   - Caching strategy

4. **Security Review**:
   - Input validation
   - Authentication/authorization
   - Data sanitization
   - Vulnerability scanning

### Review Comments Format

```
# Blocking issue (must fix)
[BLOCKER] Memory leak in connection handler
This will cause OOM in production. Use try-finally or context manager.

# Major issue (should fix)
[MAJOR] N+1 query problem in user resolver
Consider using DataLoader or batch loading.

# Minor issue (could fix)
[MINOR] Variable naming doesn't follow convention
Use camelCase for local variables.

# Suggestion (optional)
[SUGGESTION] Consider extracting this to a utility function
This pattern is repeated in 3 places.

# Question (needs clarification)
[QUESTION] Why is this timeout set to 30s?
Standard timeout is 10s. Is there a specific reason?
```

---

## Changelog Management

### Changelog Format (Keep a Changelog)

```markdown
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes

## [1.2.0] - 2025-01-15
### Added
- OAuth2 authentication support (#1234)
- GraphQL subscription endpoints (#1235)
- Redis caching layer (#1236)

### Changed
- Optimized database queries, 50% performance improvement (#1237)
- Updated Neo4j driver to v5.0 (#1238)

### Fixed
- Memory leak in connection pool (#1239)
- Race condition in auth middleware (#1240)

### Security
- Updated dependencies to patch CVE-2025-1234 (#1241)
```

### Updating Changelog

Every PR must update CHANGELOG.md:
```bash
# Add entry to Unreleased section
## [Unreleased]
### Added
- Your new feature description (#PR-number)
```

---

## Release Process

### Version Numbering (Semantic Versioning)

```
MAJOR.MINOR.PATCH-PRERELEASE+BUILD

Examples:
1.0.0           # First stable release
1.1.0           # New features (backward compatible)
1.1.1           # Bug fixes
2.0.0           # Breaking changes
2.0.0-alpha.1   # Alpha release
2.0.0-beta.1    # Beta release
2.0.0-rc.1      # Release candidate
```

### Release Branches

```bash
# Create release branch
git checkout -b release/v1.2.0 develop

# Finish release preparations
# - Update version numbers
# - Update CHANGELOG.md
# - Run full test suite
# - Performance benchmarks
# - Security scan

# Merge to main
git checkout main
git merge --no-ff release/v1.2.0
git tag -s v1.2.0 -m "Release version 1.2.0"

# Merge back to develop
git checkout develop
git merge --no-ff release/v1.2.0

# Push everything
git push origin main develop --tags

# Delete release branch
git branch -d release/v1.2.0
```

### Release Checklist

```markdown
## Release v1.2.0 Checklist

### Pre-release
- [ ] All PRs for release merged
- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] Documentation updated
- [ ] Migration guide written (if breaking changes)

### Testing
- [ ] Full test suite passes
- [ ] Performance benchmarks acceptable
- [ ] Security scan clean
- [ ] Manual smoke tests completed
- [ ] Staging environment tested

### Release
- [ ] Release branch created
- [ ] Final review completed
- [ ] Tag created and signed
- [ ] Release notes written
- [ ] Binaries/packages built

### Post-release
- [ ] Production deployment successful
- [ ] Monitoring confirms stability
- [ ] Release announced
- [ ] Documentation published
- [ ] Stakeholders notified
```

---

## Subsystem Maintainers

Following Linux kernel model with designated maintainers:

```yaml
MAINTAINERS:
  Core System:
    maintainer: "@john-doe"
    backup: "@jane-smith"
    files:
      - src/core/**
      - src/kernel/**
    
  API Layer:
    maintainer: "@api-team-lead"
    backup: "@senior-backend-dev"
    files:
      - src/api/**
      - src/graphql/**
  
  Database:
    maintainer: "@database-expert"
    backup: "@data-engineer"
    files:
      - src/db/**
      - migrations/**
  
  Authentication:
    maintainer: "@security-lead"
    backup: "@auth-developer"
    files:
      - src/auth/**
      - src/middleware/auth/**
  
  Frontend:
    maintainer: "@frontend-lead"
    backup: "@ui-developer"
    files:
      - client/**
      - src/components/**
  
  DevOps:
    maintainer: "@devops-lead"
    backup: "@sre-engineer"
    files:
      - .github/**
      - docker/**
      - k8s/**
      - scripts/**
```

### Maintainer Responsibilities

1. **Code Review**: Review all PRs touching their subsystem
2. **Design Decisions**: Approve architectural changes
3. **Quality Gates**: Ensure standards are met
4. **Documentation**: Keep subsystem docs updated
5. **Mentoring**: Guide contributors
6. **Coordination**: Sync with other maintainers

---

## Emergency Procedures

### Hotfix Process

For critical production issues:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Make minimal fix
# - Only fix the critical issue
# - No refactoring
# - No feature additions

# Fast-track review process
# - Requires 1 maintainer approval
# - Security team approval for security fixes
# - Abbreviated testing acceptable

# Merge to main
git checkout main
git merge --no-ff hotfix/critical-security-fix
git tag -s v1.1.1 -m "Hotfix: Critical security patch"

# Merge to develop
git checkout develop
git merge --no-ff hotfix/critical-security-fix

# Deploy immediately
```

### Rollback Procedure

```bash
# Identify last known good version
git log --oneline -10

# Create rollback tag
git tag -s v1.1.2-rollback <commit-hash>

# Deploy previous version
./scripts/deploy.sh v1.1.0

# Create fix forward
git checkout -b fix/rollback-issues
# Fix the issues properly
```

### Incident Response

1. **Immediate Actions**:
   - Assess severity (P0-P4)
   - Notify on-call engineer
   - Create incident channel
   - Start incident log

2. **During Incident**:
   - Apply hotfix if available
   - Rollback if necessary
   - Monitor system metrics
   - Communicate status updates

3. **Post-Incident**:
   - Write postmortem (within 48 hours)
   - Create action items
   - Update runbooks
   - Share learnings

---

## Git Tips and Best Practices

### Interactive Rebase

Clean up commits before PR:
```bash
# Rebase last 5 commits
git rebase -i HEAD~5

# Commands:
# p, pick = use commit
# r, reword = edit message
# e, edit = stop for amending
# s, squash = meld into previous
# f, fixup = like squash but discard message
# d, drop = remove commit
```

### Stashing Work

```bash
# Stash with description
git stash save "WIP: implementing user auth"

# List stashes
git stash list

# Apply specific stash
git stash apply stash@{2}

# Pop latest stash
git stash pop
```

### Cherry-picking

```bash
# Cherry-pick specific commit
git cherry-pick <commit-hash>

# Cherry-pick range
git cherry-pick <start>..<end>

# Cherry-pick without committing
git cherry-pick -n <commit-hash>
```

### Bisecting to Find Bugs

```bash
# Start bisect
git bisect start

# Mark current as bad
git bisect bad

# Mark known good commit
git bisect good v1.0.0

# Test and mark each commit
git bisect good  # or bad

# Find the culprit
git bisect reset
```

---

## Enforcement and Automation

### Pre-commit Hooks

`.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
      
  - repo: https://github.com/commitizen-tools/commitizen
    rev: v3.12.0
    hooks:
      - id: commitizen
        stages: [commit-msg]
        
  - repo: local
    hooks:
      - id: test-runner
        name: Run tests
        entry: npm test
        language: system
        pass_filenames: false
        stages: [push]
```

### CI/CD Enforcement

GitHub Actions workflow:
```yaml
name: PR Validation

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check commit messages
        uses: actions/github-script@v6
        with:
          script: |
            const commits = await github.rest.pulls.listCommits({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            
            for (const commit of commits.data) {
              if (!commit.commit.message.match(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,50}/)) {
                core.setFailed(`Invalid commit message: ${commit.commit.message}`);
              }
              if (!commit.commit.message.includes('Signed-off-by:')) {
                core.setFailed(`Missing sign-off in commit: ${commit.sha}`);
              }
            }
      
      - name: Check PR title
        uses: deepakputhraya/action-pr-title@master
        with:
          regex: '^\[(API|DB|AUTH|UI|CORE|DOCS|TEST|BUILD|CI)\] .{1,50}$'
          
      - name: Verify changelog
        run: |
          if ! git diff origin/main..HEAD -- CHANGELOG.md | grep -q "^+"; then
            echo "::error::CHANGELOG.md must be updated"
            exit 1
          fi
```

---

## Resources and References

- [Linux Kernel Development Process](https://www.kernel.org/doc/html/latest/process/development-process.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [GitLab Flow](https://docs.gitlab.com/ee/topics/gitlab_flow.html)

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained by**: LANKA Development Team  
**Review Cycle**: Quarterly

---

## Appendix: Quick Reference

### Common Commands

```bash
# Start new feature
git checkout develop && git pull
git checkout -b feature/1234-description

# Update feature branch
git fetch origin
git rebase origin/develop

# Squash commits
git rebase -i origin/develop

# Sign-off previous commit
git commit --amend -s

# Force push safely
git push --force-with-lease

# Clean up local branches
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d

# Show commit signature
git log --show-signature

# Verify tags
git tag -v v1.0.0
```

### Commit Message Template

Save as `.gitmessage`:
```
# <type>(<scope>): <subject> (max 50 chars)

# <body> (max 72 chars per line)
# Explain what and why, not how

# Fixes: #
# Implements: #
# Signed-off-by: Your Name <email@example.com>
```

Set as default:
```bash
git config --global commit.template ~/.gitmessage
```