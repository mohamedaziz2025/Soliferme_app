# Dockerfile pour Flutter Web
FROM cirrusci/flutter:stable AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration Flutter
COPY pubspec.yaml pubspec.lock ./

# Activer Flutter Web
RUN flutter config --enable-web

# Obtenir les dépendances
RUN flutter pub get

# Copier le code source
COPY . .

# Construire l'application Web
RUN flutter build web --release

# Étape de production avec Nginx
FROM nginx:alpine AS production

# Copier la configuration Nginx
COPY nginx-flutter.conf /etc/nginx/nginx.conf

# Copier les fichiers construits
COPY --from=builder /app/build/web /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Commande de démarrage
CMD ["nginx", "-g", "daemon off;"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
