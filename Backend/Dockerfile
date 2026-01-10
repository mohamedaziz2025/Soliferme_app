# Dockerfile pour Backend Node.js
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Installer les outils de développement nécessaires
RUN apk add --no-cache curl

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production=false && npm cache clean --force

# Copier les fichiers sources
COPY . .

# Étape de production
FROM node:18-alpine

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001
RUN apk add --no-cache curl

# Définir le répertoire de travail
WORKDIR /app

# Copier les dépendances et le code compilé depuis l'étape builder
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/src ./src
COPY --from=builder --chown=backend:nodejs /app/package*.json ./

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p /app/uploads /app/logs && chown -R backend:nodejs /app/uploads /app/logs

# Exposer le port
EXPOSE 5000

# Changer vers l'utilisateur non-root
USER backend

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=5000
ENV DEBUG=app:*

# Commande de démarrage
CMD ["node", "src/index.js"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1
