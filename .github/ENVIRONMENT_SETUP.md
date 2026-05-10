# Environment Variables Configuration

## Backend (.env)

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://mongodb:27017/fruitytrack
MONGODB_USER=admin
MONGODB_PASSWORD=secure_password

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@fruitytrack.com

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_GROUP_ID=fruitytrack-backend
KAFKA_CLIENT_ID=backend-client

# AI Service
AI_SERVICE_URL=http://ai-service:5000
AI_SERVICE_TIMEOUT=30000

# CORS
CORS_ORIGIN=http://localhost:3001,https://fruitytrack.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
HELMET_ENABLED=true
HELMET_STRICT_TRANSPORT_SECURITY=true
```

## Frontend (.env)

```env
# React
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.fruitytrack.example.com
REACT_APP_WS_URL=wss://api.fruitytrack.example.com/ws

# Features
REACT_APP_ENABLE_AR=true
REACT_APP_ENABLE_MAP=true
REACT_APP_ENABLE_REPORTS=true

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=GA_ID_HERE
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Map
REACT_APP_MAPBOX_TOKEN=pk.your_mapbox_token_here

# QR Code
REACT_APP_QR_CODE_SIZE=200

# Timeouts
REACT_APP_API_TIMEOUT=30000
REACT_APP_SESSION_TIMEOUT=3600000

# Debug
REACT_APP_DEBUG_MODE=false
```

## Flutter (app2/.env or pubspec.yaml)

```dart
// lib/config/app_config.dart
class AppConfig {
  static const String apiUrl = 'https://api.fruitytrack.example.com';
  static const String wsUrl = 'wss://api.fruitytrack.example.com/ws';
  static const bool debugMode = false;
  static const String appVersion = '1.0.0';
  
  // Features
  static const bool enableAR = true;
  static const bool enableOfflineMode = true;
  static const bool enableSync = true;
}
```

## AI Service (Backend/requirements.txt)

No .env needed, configured via environment variables:

```env
# Flask
FLASK_ENV=production
FLASK_DEBUG=0

# Models
MODEL_PATH=/models
YOLO_MODEL=yolov8m.pt
CONFIDENCE_THRESHOLD=0.5

# Processing
MAX_IMAGE_SIZE=2048
BATCH_SIZE=32
WORKERS=4

# Logging
LOG_LEVEL=INFO

# Performance
GPU_ENABLED=true
CUDA_VISIBLE_DEVICES=0
```

## Docker Compose (.env)

```env
# Image versions
NODE_VERSION=18-alpine
PYTHON_VERSION=3.11-slim
FLUTTER_VERSION=3.22.0

# Network
DOCKER_NETWORK=fruitytrack-network

# Ports
BACKEND_PORT=3000
FRONTEND_PORT=3001
MONGODB_PORT=27017
REDIS_PORT=6379
KAFKA_PORT=9092

# MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=changeme
MONGO_INITDB_DATABASE=fruitytrack

# Kafka
KAFKA_ADVERTISED_HOST=kafka
KAFKA_ADVERTISED_PORT=9092

# Redis
REDIS_PASSWORD=redis_password

# External URLs
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

## Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fruitytrack-config
  namespace: fruitytrack-prod
data:
  API_URL: https://api.fruitytrack.example.com
  WS_URL: wss://api.fruitytrack.example.com/ws
  LOG_LEVEL: info
  NODE_ENV: production
  REACT_APP_DEBUG_MODE: "false"
  ENABLE_AR: "true"
  ENABLE_MAP: "true"
  KAFKA_BROKERS: kafka:9092
  MONGODB_URI: mongodb://mongodb:27017/fruitytrack
  CORS_ORIGIN: https://fruitytrack.example.com
```

## Kubernetes Secrets

Create secrets:
```bash
# MongoDB credentials
kubectl create secret generic mongodb-secret \
  --from-literal=username=admin \
  --from-literal=password=secure_password \
  -n fruitytrack-prod

# JWT Secret
kubectl create secret generic jwt-secret \
  --from-literal=jwt-secret=your_jwt_secret_key_here \
  -n fruitytrack-prod

# Email SMTP
kubectl create secret generic smtp-secret \
  --from-literal=smtp-host=smtp.gmail.com \
  --from-literal=smtp-user=your_email@gmail.com \
  --from-literal=smtp-password=your_app_password \
  -n fruitytrack-prod

# Docker Registry
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=your_github_username \
  --docker-password=your_github_token \
  --docker-email=your_email@example.com \
  -n fruitytrack-prod
```

## GitHub Secrets for CI/CD

Set in GitHub repository Settings → Secrets and variables → Actions:

```
SONAR_TOKEN                 # SonarCloud analysis
GITGUARDIAN_API_KEY        # Secret scanning
KUBE_CONFIG_STAGING        # Staging kubeconfig (base64)
KUBE_CONFIG_PRODUCTION     # Production kubeconfig (base64)
```

## Environment-Specific URLs

### Development
- API: http://localhost:3000
- Frontend: http://localhost:3001
- Kafka: localhost:9092
- MongoDB: localhost:27017

### Staging
- API: https://api-staging.fruitytrack.example.com
- Frontend: https://staging.fruitytrack.example.com
- Kafka: kafka.staging.fruitytrack.example.com:9092

### Production
- API: https://api.fruitytrack.example.com
- Frontend: https://fruitytrack.example.com
- Kafka: kafka.fruitytrack.example.com:9092

## Secure Handling

1. **Never commit secrets** to git
2. **Use .gitignore** for .env files
3. **Rotate secrets regularly** (monthly recommended)
4. **Use strong passwords** (minimum 16 characters)
5. **Restrict secret access** to authorized team members
6. **Audit secret access** in Kubernetes
7. **Use secret encryption** (Sealed Secrets, HashiCorp Vault)

## Local Development Setup

```bash
# Create .env files from templates
cp .env.example .env
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env

# Update values for your environment
nano .env
nano Backend/.env
nano Frontend/.env

# Start local environment
docker-compose up -d

# Verify services
docker-compose ps
```

## CI/CD Environment Variables

These are set automatically in GitHub Actions:

```yaml
REGISTRY: ghcr.io
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
CI: true
```
