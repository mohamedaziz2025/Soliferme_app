# CI/CD Quick Start Guide

## For Developers

### Understanding the Workflow

1. **You push code** → GitHub detects the change
2. **CI Pipeline runs** → Tests, linting, security checks
3. **CD Pipeline runs** → Builds and pushes Docker images
4. **Deploy Pipeline runs** → Updates Kubernetes deployments

### Working with Pull Requests

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/my-feature

# Create Pull Request
# → GitHub Actions CI pipeline runs automatically
# → Review comments appear on the PR
# → All checks must pass before merging
```

### Checking CI Status

1. Go to the PR page
2. Scroll to "Checks" section
3. Click "Details" next to failed check to see logs
4. Or go to Actions tab to view full workflow

### Common Issues

**Tests fail due to environment variables:**
- Check CI workflow uses correct env setup
- Ensure test database is running (CI provides MongoDB service)

**Docker image doesn't build:**
- Check Dockerfile syntax
- Verify all dependencies in requirements.txt or package.json
- Check GitHub Container Registry login

**Deployment fails:**
- Check kubeconfig secrets are set correctly
- Verify Kubernetes namespace exists
- Check pod logs: `kubectl logs pod-name -n namespace`

## For DevOps/Release Engineers

### Creating a Release

1. Go to Actions tab
2. Select "Release - Version & Tag" workflow
3. Click "Run workflow"
4. Enter version (e.g., `1.0.0`)
5. Enter release notes (optional)
6. Click "Run workflow"

This will:
- Create git tag
- Create GitHub Release
- Build and push versioned Docker images
- Update all version files

### Deploying to Staging

Automatic on commits to `develop` branch.

Or manual:
1. Go to Actions → Deploy - Kubernetes
2. Click "Run workflow"
3. Select environment: `staging`
4. Click "Run workflow"

### Deploying to Production

Requires approval (configure in Settings → Environments).

Manual:
1. Go to Actions → Deploy - Kubernetes
2. Click "Run workflow"
3. Select environment: `production`
4. Click "Run workflow"
5. Approve deployment when prompted

### Monitoring Production

The monitoring workflow runs every 15 minutes automatically.

Manual health check:
```bash
# Configure kubectl
export KUBECONFIG=/path/to/config

# Check pod health
kubectl get pods -n fruitytrack-prod

# Check recent logs
kubectl logs deployment/fruitytrack-backend -n fruitytrack-prod -f

# Check resource usage
kubectl top pods -n fruitytrack-prod
```

### Emergency Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/fruitytrack-backend -n fruitytrack-prod
kubectl rollout undo deployment/fruitytrack-frontend -n fruitytrack-prod
kubectl rollout undo deployment/fruitytrack-ai -n fruitytrack-prod

# Check rollout status
kubectl rollout status deployment/fruitytrack-backend -n fruitytrack-prod
```

## For Security/Compliance

### Viewing Security Reports

1. Go to Security tab
2. View CodeQL results
3. Check for vulnerabilities in Dependencies

### Running Manual Security Scan

1. Go to Actions → Security - Vulnerability Scan
2. Click "Run workflow"
3. Check results in GitHub Security tab

### Secrets Management

**List all secrets:**
```bash
kubectl get secrets -n fruitytrack-prod
```

**View secret metadata (not values):**
```bash
kubectl describe secret jwt-secret -n fruitytrack-prod
```

**Rotate a secret:**
```bash
# Create new secret
kubectl create secret generic jwt-secret \
  --from-literal=jwt-secret=new_secret_value \
  -n fruitytrack-prod --dry-run=client -o yaml | kubectl apply -f -

# Delete old secret (if different name)
kubectl delete secret old-jwt-secret -n fruitytrack-prod
```

## GitHub Actions Interface Guide

### Viewing Workflow Runs
1. Click Actions tab
2. Select workflow name (e.g., "CI - Build & Test")
3. Click run timestamp to see details

### Understanding Workflow Status

- 🟢 Green: Success
- 🔴 Red: Failed
- ⚪ White: In progress
- ⚫ Black: Cancelled
- 🟡 Yellow: Waiting for approval

### Viewing Job Logs

1. Click workflow run
2. Click job name (e.g., "backend-test")
3. Click step name to expand
4. View console output

### Downloading Artifacts

1. Scroll down in job details
2. Click "Artifacts" section
3. Download required files

## Troubleshooting Workflows

### Check if runner is available
- Go to Settings → Actions → Runners
- Should show Ubuntu runners available

### Inspect workflow syntax
- Go to Actions tab
- Look for workflow file in .github/workflows/
- GitHub highlights syntax errors

### Re-run failed workflow
1. Click workflow run
2. Click "Re-run failed jobs" button
3. Or "Re-run all jobs" to start fresh

### Debug workflow variables
Add debug step to workflow:
```yaml
- name: Debug Info
  run: |
    echo "Branch: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
    echo "Actor: ${{ github.actor }}"
```

## Performance Optimization

### Speed up CI
- Cache dependencies: Docker layer caching enabled
- Parallel jobs: Multiple services tested simultaneously
- Skip unchanged paths: Only run tests for changed code

### Speed up deployments
- Rolling updates: Old pods replaced gradually
- Health checks: Fast failure detection
- Parallel pod startup: Multiple instances scale together

## Cost Optimization

### GitHub Actions Minutes

Free tier: 2,000 minutes/month

Estimate:
- CI run: ~10-15 minutes
- CD run: ~5-10 minutes
- Deploy run: ~5-10 minutes
- Security scan: ~10-15 minutes (weekly)
- Monitoring: ~2 minutes (every 15 min = ~3 hours/month)

**Monthly estimate:** ~500-700 minutes

To reduce:
- Limit matrix builds
- Cache dependencies aggressively
- Skip security scans on every PR (run weekly)

## Best Practices

✅ **DO:**
- Write meaningful commit messages
- Add PR descriptions
- Run tests locally before pushing
- Review workflow logs
- Use semantic versioning for releases
- Test in staging before production
- Keep secrets secure

❌ **DON'T:**
- Commit secrets to git
- Push directly to main (use PRs)
- Ignore failed checks
- Use hardcoded credentials
- Deploy without testing
- Skip security scans

## Getting Help

1. **Check logs**: Actions tab → Workflow run → Job → Step
2. **Review docs**: .github/CI_CD_PIPELINE_GUIDE.md
3. **Check examples**: .github/workflows/*.yml files
4. **Community**: GitHub Discussions or Issues tab
