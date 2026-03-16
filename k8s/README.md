# Kubernetes Deployment (FruityTrack)

Ce dossier fournit une base de déploiement Kubernetes pour couvrir l'exigence d'infrastructure Kubernetes.

## Fichiers

- `namespace.yaml` : namespace `soliferme`
- `configmap.yaml` : configuration applicative
- `secret-example.yaml` : exemple de secret (à adapter)
- `mongodb.yaml` : MongoDB + service
- `kafka.yaml` : Zookeeper + Kafka + services
- `ai-service.yaml` : service IA + service
- `backend.yaml` : API Node.js + service
- `frontend.yaml` : frontend React + service + ingress

## Déploiement

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret-example.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

## Vérification

```bash
kubectl get pods -n soliferme
kubectl get svc -n soliferme
kubectl get ingress -n soliferme
```

## Notes

- Les images `soliferme-backend:latest`, `soliferme-ai-service:latest` et `soliferme-frontend:latest` doivent exister dans un registre accessible par le cluster.
- `secret-example.yaml` est un template ; remplacez toutes les valeurs sensibles avant usage.
