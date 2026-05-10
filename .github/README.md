# GitHub Actions CI/CD Pipeline

Complete continuous integration and continuous deployment pipeline for the FruityTrack application.

## 📋 Overview

This directory contains GitHub Actions workflows that automate:

- ✅ **Testing** - Unit tests, integration tests, and code quality checks
- 🏗️ **Building** - Docker image creation for all services
- 🚀 **Deployment** - Automatic deployment to Kubernetes clusters
- 🔒 **Security** - Vulnerability scanning and secret detection
- 📊 **Monitoring** - Health checks and performance monitoring
- 📦 **Releases** - Semantic versioning and release management

## 🗂️ File Structure

```
.github/
├── workflows/                    # GitHub Actions workflows
│   ├── ci.yml                   # Continuous Integration pipeline
│   ├── cd.yml                   # Build and push Docker images
│   ├── deploy.yml               # Deploy to Kubernetes
│   ├── security.yml             # Security scanning
│   ├── release.yml              # Release management
│   └── monitoring.yml           # Health checks and monitoring
├── CI_CD_PIPELINE_GUIDE.md      # Detailed configuration guide
├── ENVIRONMENT_SETUP.md         # Environment variables guide
├── QUICKSTART.md                # Developer quick start
└── README.md                    # This file
```

## 🚀 Quick Start

### 1. Initial Setup

**Required Secrets** (Settings → Secrets and variables → Actions):

```bash
# Base64 encoded kubeconfig files
KUBE_CONFIG_STAGING
KUBE_CONFIG_PRODUCTION

# Code quality and security
SONAR_TOKEN
GITGUARDIAN_API_KEY
```

Encode kubeconfig:
```bash
cat ~/.kube/config | base64 -w 0
```

**Configure Environments** (Settings → Environments):

- `staging`: For develop branch
- `production`: For main branch (with approval)

### 2. First Deployment

```bash
# Create develop and main branches (if not exists)
git checkout -b develop
git push -u origin develop

# Push to trigger CI pipeline
git push

# Monitor in Actions tab
# → See CI pipeline run
# → See CD pipeline build images
# → See Deploy pipeline (staging)
```

## 📊 Workflow Diagram

```
┌─────────────────┐
│  Push to Git    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  CI Pipeline (ci.yml)                       │
│  ├─ Backend Tests + Build                   │
│  ├─ Frontend Tests + Build                  │
│  ├─ AI Service Tests                        │
│  ├─ Flutter Build                           │
│  ├─ Code Quality (SonarCloud)               │
│  └─ Security Scan (Trivy, npm audit)        │
└────────┬────────────────────────────────────┘
         │ (all checks pass)
         ▼
┌─────────────────────────────────────────────┐
│  CD Pipeline (cd.yml)                       │
│  ├─ Build Backend Docker image              │
│  ├─ Build Frontend Docker image             │
│  └─ Build AI Service Docker image           │
│     └─ Push to GitHub Container Registry    │
└────────┬────────────────────────────────────┘
         │ (images pushed)
         ▼
┌─────────────────────────────────────────────┐
│  Deploy Pipeline (deploy.yml)               │
│  ├─ Staging (auto on develop)               │
│  │  ├─ Update Kubernetes manifests          │
│  │  ├─ Wait for rollout                     │
│  │  └─ Health checks                        │
│  └─ Production (manual on main)             │
│     ├─ Backup database                      │
│     ├─ Update Kubernetes manifests          │
│     ├─ Wait for rollout                     │
│     ├─ Verify health                        │
│     └─ Rollback on failure                  │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Monitoring Pipeline (monitoring.yml)       │
│  ├─ Every 15 minutes                        │
│  ├─ Pod health checks                       │
│  ├─ Resource utilization                    │
│  ├─ Database connectivity                   │
│  ├─ API health endpoints                    │
│  └─ Create issues on failure                │
└─────────────────────────────────────────────┘
```

## 🔄 Deployment Flow

### Develop Branch → Staging

```
1. Push to develop
2. CI pipeline runs
3. CD pipeline builds images
4. Deploy automatically to staging
5. Health checks verify deployment
```

### Main Branch → Production

```
1. Create PR on main (requires approval)
2. CI pipeline runs
3. Merge to main
4. CD pipeline builds images
5. Deploy pipeline waits for approval
6. Database backup created
7. Deploy to production
8. Automatic rollback on failure
```

## 📋 Workflows Reference

### CI Pipeline (`ci.yml`)
Triggered on: Push to main/develop, Pull requests

**Jobs:**
- `backend-test`: Node.js tests with MongoDB
- `frontend-test`: React tests and build
- `ai-service-test`: Python tests
- `flutter-build`: Flutter code analysis
- `code-quality`: SonarCloud analysis
- `security-scan`: Trivy and npm audit
- `dependency-check`: Dependency vulnerabilities
- `tests-summary`: Overall status report

### CD Pipeline (`cd.yml`)
Triggered on: After successful CI

**Jobs:**
- `push-backend`: Build and push backend image
- `push-frontend`: Build and push frontend image
- `push-ai`: Build and push AI service image

### Deploy Pipeline (`deploy.yml`)
Triggered on: After successful CD, or manual

**Jobs:**
- `deploy-staging`: Auto-deploy to staging cluster
- `deploy-production`: Manual deploy to production

### Security Pipeline (`security.yml`)
Triggered on: Weekly schedule, dependency changes, manual

**Jobs:**
- `dependency-scanning`: npm audit, pip-audit
- `container-scanning`: Trivy vulnerability scan
- `secrets-detection`: Trufflehogg, GitGuardian
- `codeql-scan`: GitHub CodeQL analysis

### Release Pipeline (`release.yml`)
Triggered on: Manual workflow dispatch

**Creates:**
- Git tag with version
- GitHub Release with notes
- Updates version in all files
- Pushes images with version tag

### Monitoring Pipeline (`monitoring.yml`)
Triggered on: Every 15 minutes

**Checks:**
- Pod health and status
- Resource utilization
- Database connectivity
- API health endpoints
- Certificate expiry
- Recent error logs

## 🔐 Security Features

- **Secret scanning**: Detects exposed credentials
- **Dependency scanning**: Identifies vulnerabilities
- **Container scanning**: Trivy image vulnerability scan
- **Code analysis**: CodeQL static analysis
- **RBAC**: Kubernetes role-based access control
- **Network policies**: Pod-to-pod communication restrictions
- **Pod security policies**: Restrict privileged containers

## 📈 Monitoring & Alerts

The monitoring workflow runs every 15 minutes and:

- Checks pod health and restart counts
- Monitors CPU and memory usage
- Verifies database connectivity
- Calls API health endpoints
- Checks persistent volume status
- Verifies TLS certificate expiry
- Analyzes recent pod logs
- Creates GitHub issues on failure

## 🛠️ Common Tasks

### View Workflow Logs
```
Actions tab → Select workflow → Click run
```

### Deploy to Staging
```
Actions → Deploy - Kubernetes → Run workflow → Select staging
```

### Create Release
```
Actions → Release - Version & Tag → Run workflow → Enter version 1.0.0
```

### Manual Security Scan
```
Actions → Security - Vulnerability Scan → Run workflow
```

### Rollback Production
```bash
kubectl rollout undo deployment/fruitytrack-backend -n fruitytrack-prod
```

## 📚 Documentation

- **[CI/CD Pipeline Guide](./CI_CD_PIPELINE_GUIDE.md)** - Detailed configuration and architecture
- **[Environment Setup](./ENVIRONMENT_SETUP.md)** - Environment variables for all services
- **[Quick Start](./QUICKSTART.md)** - Developer and DevOps quick reference

## ✅ Pre-Deployment Checklist

- [ ] All secrets configured (kubeconfig, API keys)
- [ ] GitHub Environments set up (staging, production)
- [ ] Kubernetes namespaces created
- [ ] ConfigMaps and Secrets deployed
- [ ] Monitoring configured
- [ ] Alerting configured (Slack, email, etc.)
- [ ] Backup strategy defined
- [ ] Disaster recovery plan documented
- [ ] Security scanning enabled
- [ ] Rate limiting configured

## 🐛 Troubleshooting

### Tests Failing
1. Check test logs in Actions tab
2. Verify database is running
3. Check environment variables
4. Run tests locally: `npm test` or `pytest`

### Images Not Pushing
1. Verify `GITHUB_TOKEN` permissions
2. Check GitHub Container Registry login
3. View logs: `docker push ghcr.io/...`

### Deployment Failing
1. Check kubeconfig validity
2. Verify Kubernetes namespace exists
3. Check image availability in registry
4. View pod logs: `kubectl logs pod-name`

### Monitoring Alerts
1. Check pod status: `kubectl get pods`
2. View logs: `kubectl logs deployment-name`
3. Check resources: `kubectl top pods`

## 📞 Support

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check guides and troubleshooting
- **Security**: Report vulnerabilities to security@fruitytrack.example.com

## 📝 License

MIT License - See LICENSE file

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
