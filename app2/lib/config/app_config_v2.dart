/**
 * Configuration du Service API pour Flutter
 * Utilise les variables d'environnement au lieu des IPs codées en dur
 */

class AppConfig {
  // ============================================================
  // URLS DE BASE
  // ============================================================
  
  // Déterminer l'URL du backend selon la plateforme
  static const String backendBaseUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: _getDefaultBackendUrl(),
  );
  
  static const String aiServiceUrl = String.fromEnvironment(
    'AI_SERVICE_URL', 
    defaultValue: _getDefaultAiServiceUrl(),
  );

  // ============================================================
  // ENDPOINTS API
  // ============================================================
  
  static const String authBase = '$backendBaseUrl/api/auth';
  static const String treesBase = '$backendBaseUrl/api/trees';
  static const String analysisBase = '$backendBaseUrl/api/analysis';
  
  // Authentication
  static const String loginEndpoint = '$authBase/login';
  static const String registerEndpoint = '$authBase/register';
  static const String profileEndpoint = '$authBase/profile';
  
  // Trees
  static const String treesListEndpoint = '$treesBase';
  static const String createAnalysisEndpoint = '$analysisBase/create-with-ai';
  
  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  static const int connectionTimeout = 30000; // 30 secondes
  static const int receiveTimeout = 30000;
  
  // ============================================================
  // DÉTECTION DE LA PLATEFORME
  // ============================================================
  
  static const String _getDefaultBackendUrl = _detectBackendUrl;
  static const String _getDefaultAiServiceUrl = _detectAiServiceUrl;
  
  /// Détecte l'URL du backend selon la plateforme d'exécution
  static const String _detectBackendUrl = _platformBackendUrl;
  
  /// Détecte l'URL du service AI selon la plateforme d'exécution
  static const String _detectAiServiceUrl = _platformAiServiceUrl;
  
  // URLs par plateforme
  // Emulateur Android: 10.0.2.2 pointe vers localhost de l'hôte
  // Simulateur iOS: localhost
  // Appareil physique: IP du serveur ou DNS
  
  static const String _platformBackendUrl = 'http://localhost:35000';
  static const String _platformAiServiceUrl = 'http://localhost:5001';
  
  // ============================================================
  // CONFIGURATION PAR BUILD TYPE
  // ============================================================
  
  /// Configuration pour développement (debug)
  static const String debugBackendUrl = 'http://localhost:35000';
  static const String debugAiUrl = 'http://localhost:5001';
  
  /// Configuration pour production
  static const String prodBackendUrl = 'http://localhost:35000'; // À remplacer par votre URL
  static const String prodAiUrl = 'http://localhost:5001'; // À remplacer
  
  // ============================================================
  // UTILITAIRES
  // ============================================================
  
  /// Vérifier si on est en mode développement
  static bool isDebugMode() {
    return backendBaseUrl.contains('localhost') || 
           backendBaseUrl.contains('10.0.2.2');
  }
  
  /// Construire une URL complète
  static String buildUrl(String path) {
    return '$backendBaseUrl$path';
  }
}
