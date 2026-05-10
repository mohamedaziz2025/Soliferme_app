# CI/CD Pipeline Setup Instructions

Complete step-by-step guide to set up and activate the CI/CD pipeline.

## ✅ Prerequisites

- GitHub repository with admin access
- Kubernetes cluster (staging and production)
- Docker Registry access (GitHub Container Registry)
- SonarCloud account (optional, for code quality)
- GitGuardian account (optional, for secret scanning)

## 📋 Step 1: Prepare Kubernetes Clusters

### Create Namespaces

```bash
# Staging cluster
kubectl create namespace fruitytrack-staging
kubectl create namespace ingress-nginx

# Production cluster
kubectl create namespace fruitytrack-prod
kubectl create namespace ingress-nginx
```

### Deploy CI/CD Configuration

```bash
# Staging
kubectl apply -f k8s/ci-cd-config.yaml --namespace fruitytrack-staging

# Production
kubectl apply -f k8s/ci-cd-config.yaml --namespace fruitytrack-prod
```

### Create Image Pull Secret

```bash
# For Staging
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-pat> \
  --docker-email=<your-email> \
  --namespace fruitytrack-staging

# For Production
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-pat> \
  --docker-email=<your-email> \
  --namespace fruitytrack-prod
```

Where:
- `<github-username>`: Your GitHub username
- `<github-pat>`: Personal Access Token with `read:packages` scope
- `<your-email>`: Your email address

### Create Database Secrets

```bash
# Staging
kubectl create secret generic mongodb-secret \
  --from-literal=username=admin \
  --from-literal=password=staging-password \
  --namespace fruitytrack-staging

# Production
kubectl create secret generic mongodb-secret \
  --from-literal=username=admin \
  --from-literal=password=<secure-password> \
  --namespace fruitytrack-prod
```

### Create JWT Secrets

```bash
# Staging
kubectl create secret generic jwt-secret \
  --from-literal=jwt-secret=staging-jwt-key-change-me \
  --namespace fruitytrack-staging

# Production
kubectl create secret generic jwt-secret \
  --from-literal=jwt-secret=<secure-jwt-key> \
  --namespace fruitytrack-prod
```

### Create SMTP Secrets (if using email)

```bash
# Staging
kubectl create secret generic smtp-secret \
  --from-literal=smtp-host=smtp.gmail.com \
  --from-literal=smtp-user=your-email@gmail.com \
  --from-literal=smtp-password=your-app-password \
  --namespace fruitytrack-staging

# Production
kubectl create secret generic smtp-secret \
  --from-literal=smtp-host=smtp.gmail.com \
  --from-literal=smtp-user=your-email@gmail.com \
  --from-literal=smtp-password=your-app-password \
  --namespace fruitytrack-prod
```

## 🔑 Step 2: Generate Kubeconfig Files

### For Staging Cluster

```bash
# Get kubeconfig from your staging cluster
# Method 1: From AWS EKS
aws eks update-kubeconfig --region eu-west-1 --name fruitytrack-staging

# Method 2: From existing kubeconfig
cat ~/.kube/staging-config

# Encode to base64
cat ~/.kube/config | base64 -w 0
```

### For Production Cluster

```bash
# Get kubeconfig from your production cluster
# Method 1: From AWS EKS
aws eks update-kubeconfig --region eu-west-1 --name fruitytrack-prod

# Method 2: From existing kubeconfig
cat ~/.kube/prod-config

# Encode to base64
cat ~/.kube/config | base64 -w 0
```

## 🔐 Step 3: Configure GitHub Secrets

### Access GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"

### Add Required Secrets

#### 1. Kubernetes Credentials

**`KUBE_CONFIG_STAGING`**
- Value: Base64 encoded staging kubeconfig
- Click "Add secret"

**`KUBE_CONFIG_PRODUCTION`**
- Value: Base64 encoded production kubeconfig
- Click "Add secret"

#### 2. Code Quality (Optional but Recommended)

**`SONAR_TOKEN`**
1. Go to [SonarCloud](https://sonarcloud.io)
2. Sign up with GitHub
3. Generate token in user settings
4. Add as secret

**`GITGUARDIAN_API_KEY`**
1. Go to [GitGuardian](https://www.gitguardian.com)
2. Sign up and get API key
3. Add as secret

### Verify Secrets

```bash
# List secret names (not values)
gh secret list

# Should show:
# KUBE_CONFIG_PRODUCTION
# KUBE_CONFIG_STAGING
# SONAR_TOKEN (if added)
# GITGUARDIAN_API_KEY (if added)
```

## 🌍 Step 4: Configure GitHub Environments

### Create Staging Environment

1. Settings → Environments → New environment
2. Name: `staging`
3. Configure protection rules:
   - Deployment branches: `develop`
   - Reviewers: (optional)
4. Click "Create environment"

### Create Production Environment

1. Settings → Environments → New environment
2. Name: `production`
3. Configure protection rules:
   - Deployment branches: `main`
   - Reviewers: 2-3 required (recommended)
4. Click "Create environment"

### Add Environment Secrets (Optional)

If you need environment-specific secrets:

1. Click environment name
2. Click "Add secret"
3. Add environment-specific variables

## 🔨 Step 5: Configure Branch Protection Rules

### For Main Branch

1. Settings → Branches → Add rule
2. Apply to: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Restrict who can push to matching branches
4. Save

### For Develop Branch

1. Settings → Branches → Add rule
2. Apply to: `develop`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass
4. Save

## 🔍 Step 6: Configure Code Quality (SonarCloud)

### Set up SonarCloud Integration

1. Go to [SonarCloud.io](https://sonarcloud.io)
2. Sign in with GitHub
3. Add your organization/repository
4. Copy project key and organization key
5. Add to repository secrets (done in Step 3)

### Configure SonarQube Properties

Create `sonar-project.properties` in root:

```properties
sonar.projectKey=fruitytrack
sonar.organization=your-org
sonar.sources=Backend,Frontend,app2/lib
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**
sonar.tests=Backend/tests,Frontend/src
sonar.test.inclusions=**/*.test.js,**/*.test.ts,**/*.test.py
```

## 🔒 Step 7: Configure Secret Scanning

### Enable GitHub Secret Scanning

1. Settings → Code security and analysis
2. Enable:
   - ✅ Secret scanning
   - ✅ Push protection (if available)
3. Save

### Configure .gitignore

Ensure `.gitignore` has:

```
# Environment files
.env
.env.local
.env.staging
.env.production

# Kubernetes secrets
k8s/secrets*.yaml
*.kubeconfig

# IDE
.vscode/
.idea/

# Dependencies
node_modules/
__pycache__/
*.pyc
```

## ✅ Step 8: Test the Pipeline

### Test CI Pipeline

```bash
# Create test branch
git checkout -b test/ci-pipeline

# Make a small change
echo "# Test" >> README.md

# Push and watch Actions
git add README.md
git commit -m "test: trigger CI pipeline"
git push -u origin test/ci-pipeline

# Check Actions tab for workflow run
# Monitor: ci.yml should start
```

### Test Staging Deployment

```bash
# Merge to develop
git checkout develop
git pull origin develop
git merge --no-ff test/ci-pipeline
git push origin develop

# Watch Actions:
# 1. ci.yml completes
# 2. cd.yml builds images
# 3. deploy.yml deploys to staging

# Check staging cluster
kubectl get pods -n fruitytrack-staging
kubectl get svc -n fruitytrack-staging
```

### Test Production Deployment

```bash
# Create PR on main
git checkout main
git pull origin main
git merge --no-ff develop

# Create PR
git push -u origin feature/test-prod-deploy
# Create PR on GitHub

# After approval and merge:
# 1. ci.yml completes
# 2. cd.yml builds images
# 3. deploy.yml waits for approval
# 4. Approve deployment in Actions

# Check production cluster
kubectl get pods -n fruitytrack-prod
kubectl get svc -n fruitytrack-prod
```

## 🐛 Step 9: Verify Deployments

### Staging Verification

```bash
# Check pods
kubectl get pods -n fruitytrack-staging

# Check logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-staging -f

# Get service info
kubectl get svc -n fruitytrack-staging

# Test API health
kubectl exec -it <pod-name> -n fruitytrack-staging -- curl http://localhost:3000/health
```

### Production Verification

```bash
# Check pods
kubectl get pods -n fruitytrack-prod

# Check logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-prod -f

# Get service info
kubectl get svc -n fruitytrack-prod

# Test API health
kubectl exec -it <pod-name> -n fruitytrack-prod -- curl http://localhost:3000/health
```

## 📋 Step 10: Set up Monitoring & Alerts

### Enable Notifications

1. Settings → Code security and analysis
2. Enable notifications for:
   - Dependabot alerts
   - Secret scanning alerts

### Configure Slack Integration (Optional)

1. Create GitHub Actions Slack app
2. Settings → Integrations & services
3. Add webhook for failed workflows

### Test Monitoring

```bash
# Manually trigger monitoring
Actions → Monitoring - Health & Performance → Run workflow

# Monitor logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-staging --tail=50
```

## 🚀 Step 11: Configure Continuous Monitoring

### Enable Automated Dependency Updates

1. Settings → Code security and analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"

### Schedule Regular Scans

Security scanning runs automatically:
- Weekly (schedule: Sunday 2 AM)
- On dependency file changes
- Manual trigger available

## ✅ Final Checklist

- [ ] Kubernetes clusters ready (staging + prod)
- [ ] Namespaces created
- [ ] Secrets deployed to clusters
- [ ] GitHub Secrets configured (kubeconfig, API keys)
- [ ] GitHub Environments set up (staging, production)
- [ ] Branch protection rules enabled
- [ ] Code quality (SonarCloud) configured
- [ ] Secret scanning enabled
- [ ] CI pipeline tested (merge to develop)
- [ ] CD pipeline tested (images pushed)
- [ ] Staging deployment tested
- [ ] Production deployment tested
- [ ] Monitoring configured and tested
- [ ] Alerts configured
- [ ] Team trained on CI/CD process
- [ ] Documentation updated with URLs
- [ ] Backup strategy documented
- [ ] Disaster recovery plan documented

## 📞 Post-Deployment Support

### Monitor Deployments

```bash
# Watch deployment progress
kubectl rollout status deployment/fruitytrack-backend -n fruitytrack-staging

# Get deployment history
kubectl rollout history deployment/fruitytrack-backend -n fruitytrack-staging

# Rollback if needed
kubectl rollout undo deployment/fruitytrack-backend -n fruitytrack-staging
```

### Access Logs

```bash
# Recent logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-staging --tail=100

# Follow logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-staging -f

# Search logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-staging | grep error
```

### Common Commands

```bash
# Check pod status
kubectl get pods -n fruitytrack-staging -o wide

# Describe pod
kubectl describe pod <pod-name> -n fruitytrack-staging

# Execute command in pod
kubectl exec -it <pod-name> -n fruitytrack-staging -- bash

# View events
kubectl get events -n fruitytrack-staging --sort-by='.lastTimestamp'
```

---

**Setup completed!** Your CI/CD pipeline is ready to deploy code automatically to Kubernetes. 🎉
