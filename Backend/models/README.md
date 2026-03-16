# Modeles IA backend

Ce dossier contient les modeles utilises par le service AI Python.

Modele attendu principal:

- yolov8n.pt

Chemin attendu:

- Backend/models/yolov8n.pt

Dans Docker:

- Monte via volume sur /app/models
- Variable utilisee: MODEL_PATH=/app/models

Sans ce fichier, le service peut basculer en mode basique (sans YOLO).
