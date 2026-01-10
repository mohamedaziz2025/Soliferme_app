class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic details;

  AppException(this.message, {this.code, this.details});

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException(String message, {String? code, dynamic details}) 
    : super(message, code: code ?? 'NETWORK_ERROR', details: details);
}

class AuthException extends AppException {
  AuthException(String message, {String? code, dynamic details}) 
    : super(message, code: code ?? 'AUTH_ERROR', details: details);
}

class ValidationException extends AppException {
  final Map<String, String> errors;

  ValidationException(String message, this.errors, {String? code, dynamic details}) 
    : super(message, code: code ?? 'VALIDATION_ERROR', details: details);
}

class DatabaseException extends AppException {
  DatabaseException(String message, {String? code, dynamic details}) 
    : super(message, code: code ?? 'DB_ERROR', details: details);
}

class CacheException extends AppException {
  CacheException(String message, {String? code, dynamic details}) 
    : super(message, code: code ?? 'CACHE_ERROR', details: details);
}

class SyncException extends AppException {
  SyncException(String message, {String? code, dynamic details}) 
    : super(message, code: code ?? 'SYNC_ERROR', details: details);
}

class PermissionException extends AppException {
  PermissionException(String message, {String? code, dynamic details}) 
    : super(message, code: code ?? 'PERMISSION_ERROR', details: details);
}

class ErrorHandler {
  static String getLocalizedMessage(AppException error) {
    // Messages d'erreur localisés
    final messages = {
      'NETWORK_ERROR': 'Erreur de connexion. Vérifiez votre connexion internet.',
      'AUTH_ERROR': 'Erreur d\'authentification. Veuillez vous reconnecter.',
      'VALIDATION_ERROR': 'Données invalides. Veuillez vérifier vos entrées.',
      'DB_ERROR': 'Erreur de base de données. Veuillez réessayer.',
      'CACHE_ERROR': 'Erreur de cache. Veuillez redémarrer l\'application.',
      'SYNC_ERROR': 'Erreur de synchronisation. Vos données seront synchronisées plus tard.',
      'PERMISSION_ERROR': 'Permission refusée. Veuillez vérifier vos paramètres.',
    };

    return messages[error.code] ?? error.message;
  }

  static bool shouldRetry(AppException error) {
    // Définir quelles erreurs peuvent être réessayées
    return error is NetworkException || 
           error is DatabaseException ||
           error is SyncException;
  }

  static Duration getRetryDelay(int attempt) {
    // Délai exponentiel entre les tentatives
    return Duration(seconds: (1 << attempt)); // 1s, 2s, 4s, 8s, etc.
  }

  static bool shouldShowToUser(AppException error) {
    // Définir quelles erreurs doivent être montrées à l'utilisateur
    return !(error is CacheException || error.code == 'SILENT_ERROR');
  }
}
