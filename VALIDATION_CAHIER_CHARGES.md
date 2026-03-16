# Validation des points manquants - Cahier des charges Fruity Track

Ce document liste les points qui étaient manquants et les actions réalisées.

## 1. Architecture événementielle Kafka

### Réalisé

- Ajout de Kafka côté backend (`kafkajs`)
- Ajout d'un bus d'événements backend (`Backend/src/services/eventBus.js`)
- Publication d'événements sur:
  - synchronisation offline (`sync.uploaded`)
  - création d'analyse (`analysis.created`)
- Ajout des services `zookeeper` et `kafka` dans Docker Compose

### Vérification rapide

```bash
docker-compose up -d zookeeper kafka backend
```

Vérifier les logs backend pour la connexion producteur Kafka.

## 2. Infrastructure Kubernetes

### Réalisé

- Création du dossier `k8s/` avec manifests:
  - namespace
  - configmap
  - secrets (exemple)
  - mongodb
  - zookeeper/kafka
  - ai-service
  - backend
  - frontend + ingress

### Vérification rapide

```bash
kubectl apply -f k8s/
kubectl get pods -n soliferme
```

## 3. Preuve de performance IA (< 2s)

### Réalisé

  - `aiInferenceMs`
  - `totalProcessingMs`
  - `meets2sTarget` (booléen)

### Vérification rapide

Appeler `POST /api/analysis/create-with-ai` et vérifier le bloc `performance` dans la réponse.

## 3.b MobileNetV2 sur mobile (TFLite)

### Réalisé

- Chargement explicite du modèle MobileNetV2 dans `app2/lib/services/analysis_service.dart`
  - modèle principal: `assets/models/mobilenet_v2_tree_health.tflite`
  - fallback legacy: `tree_health_model.tflite`, `tree_analysis_model.tflite`
- Validation runtime de la compatibilité du modèle (shape d'entrée `[1,224,224,3]`)
- Exposition du champ `model_path` dans les résultats pour traçabilité

### Vérification rapide

1. Placer le modèle MobileNetV2 à l'emplacement attendu.
2. Lancer l'application mobile.
3. Effectuer une analyse et vérifier `model_path` dans le résultat.

## 4. Robustesse offline mobile

### Réalisé

- Correction de l'URL de sync mobile: suppression de `http://localhost:3000/api` codé en dur
- Utilisation de la config centralisée `AppConfig.backendBaseUrl`

### Impact

- Le module de synchronisation suit maintenant la même base URL que le reste de l'app.

---

## Reste à valider sur environnement réel

- Contrôle de bout en bout de la consommation Kafka (consumer)
- Test de charge pour confirmer la stabilité sous trafic
- Validation terrain de la fluidité AR (>30 FPS) avec mesures instrumentées device
