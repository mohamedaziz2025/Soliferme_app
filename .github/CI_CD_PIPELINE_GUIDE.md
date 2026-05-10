# CI/CD Pipeline Configuration Guide

## Overview

This project uses GitHub Actions for continuous integration, continuous delivery, and continuous deployment (CI/CD). The pipeline automates:

- **Building & Testing**: Backend, Frontend, AI Service, and Flutter app
- **Code Quality**: Linting, testing, and SonarCloud analysis
- **Security**: Vulnerability scanning, dependency checking, and secret detection
- **Docker Images**: Building and pushing container images
- **Kubernetes Deployment**: Staging and production deployments
- **Monitoring**: Health checks and performance metrics

## Workflows

### 1. CI Workflow (`ci.yml`)
**Trigger**: Push to main/develop, Pull Requests

Runs on every commit:
- Backend tests (Node.js + MongoDB)
- Frontend tests (React)
- AI Service tests (Python)
- Flutter build validation
- Code quality analysis (SonarCloud)
- Security scanning (Trivy, npm audit)

### 2. CD Workflow (`cd.yml`)
**Trigger**: After successful CI, Docker image push

Builds and pushes Docker images to GitHub Container Registry:
- `fruitytrack-backend`
- `fruitytrack-frontend`
- `fruitytrack-ai`

### 3. Deploy Workflow (`deploy.yml`)
**Trigger**: After successful CD push

Deploys to Kubernetes:
- **Staging**: Automatically on develop branch
- **Production**: Manually triggered or on main branch with approval

### 4. Security Workflow (`security.yml`)
**Trigger**: Weekly schedule, dependency updates, manual trigger

Security scanning:
- Dependency vulnerabilities (npm audit, pip-audit)
- Container vulnerabilities (Trivy)
- Secrets detection (Trufflehogg, GitGuardian)
- Code analysis (CodeQL)

### 5. Release Workflow (`release.yml`)
**Trigger**: Manual workflow dispatch

Creates semantic versioned releases:
- Creates git tag
- Generates GitHub Release
- Updates version in all services
- Documents Docker image versions

### 6. Monitoring Workflow (`monitoring.yml`)
**Trigger**: Every 15 minutes (scheduled)

Health checks:
- Pod status
- Resource utilization
- Database connectivity
- API endpoints
- Certificate expiry
- Log analysis

## Required Secrets

Add these to GitHub Settings → Secrets and Variables → Actions:

### Container Registry
```
GITHUB_TOKEN  # Automatically provided by GitHub
```

### Kubernetes
```
KUBE_CONFIG_STAGING       # Base64 encoded kubeconfig for staging
KUBE_CONFIG_PRODUCTION    # Base64 encoded kubeconfig for production
```

### Security & Monitoring
```
SONAR_TOKEN              # SonarCloud token for code quality
GITGUARDIAN_API_KEY      # GitGuardian for secret detection
```

To encode kubeconfig:
```bash
cat ~/.kube/config | base64 -w 0
```

## Environment Setup

### GitHub Environments
Configure protected environments in Settings → Environments:

**Staging**
- Ref: `refs/heads/develop`
- Reviewers: Optional
- Deployment branches: `develop`

**Production**
- Ref: `refs/heads/main`
- Reviewers: Required (security)
- Deployment branches: `main`

## Image Tagging Strategy

Docker images are tagged with:
- `develop-<short-sha>`: For develop branch
- `main-<short-sha>`: For main branch
- `latest`: For main branch (default branch)
- `v1.0.0`: For semantic releases

Example:
```
ghcr.io/owner/fruitytrack-backend:develop-a1b2c3d
ghcr.io/owner/fruitytrack-backend:main-x9y8z7w
ghcr.io/owner/fruitytrack-backend:latest
ghcr.io/owner/fruitytrack-backend:v1.0.0
```

## Deployment Flow

```
commit to main/develop
    ↓
CI Pipeline (tests, linting, security)
    ↓
CD Pipeline (build & push Docker images)
    ↓
Deploy Pipeline
    ├─ Staging (automatic for develop)
    └─ Production (manual for main)
    ↓
Monitoring (continuous health checks)
```

## Manual Deployment

To manually trigger a deployment:

1. Go to Actions → Deploy - Kubernetes
2. Click "Run workflow"
3. Select environment (staging/production)
4. For production, deployment requires approval

## Kubernetes Namespaces

- `fruitytrack-staging`: Staging environment
- `fruitytrack-prod`: Production environment

## Health Checks

The monitoring workflow runs every 15 minutes and checks:
- Pod health and status
- Resource utilization (CPU, memory)
- Database connectivity
- API health endpoints
- Persistent volume status
- Certificate expiry
- Recent logs for errors

## Rollback Procedure

Automatic rollback on deployment failure:
```bash
# Manual rollback if needed
kubectl rollout undo deployment/fruitytrack-backend -n fruitytrack-prod
kubectl rollout undo deployment/fruitytrack-frontend -n fruitytrack-prod
kubectl rollout undo deployment/fruitytrack-ai -n fruitytrack-prod
```

## Viewing Logs

### GitHub Actions Logs
- Go to Actions tab → Select workflow → Select run

### Kubernetes Pod Logs
```bash
# Staging
kubectl logs deployment/fruitytrack-backend -n fruitytrack-staging -f

# Production
kubectl logs deployment/fruitytrack-backend -n fruitytrack-prod -f
```

## Troubleshooting

### Images not pushing
- Check `GITHUB_TOKEN` has `packages: write` permission
- Verify Docker login: `docker login ghcr.io`

### Deployment fails
- Check kubeconfig validity: `kubectl cluster-info`
- Verify namespace exists: `kubectl get namespace`
- Check image availability: `kubectl describe pod <pod-name>`

### Tests failing
- Check logs in Actions tab
- Ensure .env files are configured
- Verify database is running for tests

## Security Best Practices

1. **Never commit secrets**: Use GitHub Secrets
2. **Scan dependencies**: Weekly security scans
3. **Review PRs**: Require code review for main branch
4. **Monitor deployments**: Check health after deployment
5. **Rotate credentials**: Regularly update secrets
6. **Use RBAC**: Limit Kubernetes permissions

## Performance Optimization

- Docker layer caching enabled (buildx cache)
- Parallel job execution where possible
- Incremental deployments (rolling updates)
- Health check timeouts set appropriately

## Next Steps

1. Configure GitHub Secrets (kubeconfig, API keys)
2. Set up GitHub Environments with protection rules
3. Configure SonarCloud integration
4. Set up Slack/email notifications
5. Test all workflows in develop branch first
6. Document your specific environment URLs
7. Set up alerting for monitoring failures
