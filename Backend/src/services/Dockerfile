# Dockerfile pour le Service AI Python
FROM python:3.9-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libglx-mesa0 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les requirements depuis la racine Backend
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier les scripts Python depuis src/services
COPY src/services/ai_analysis_server.py .
COPY src/services/tree_analysis_service.py .

# Créer le dossier pour les modèles
RUN mkdir -p models uploads

# Créer un utilisateur non-root
RUN useradd -m -u 1000 aiuser && \
    chown -R aiuser:aiuser /app

USER aiuser

# Exposer le port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

# Démarrer le serveur Flask
CMD ["python", "ai_analysis_server.py"]
