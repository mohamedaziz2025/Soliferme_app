class AppConfig {
  // URL configurable via --dart-define=BACKEND_URL.
  // The mobile app talks only to backend REST APIs.
  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://72.62.71.97:35000',
  );

  static String get normalizedBackendUrl {
    final trimmed = backendUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (trimmed.endsWith('/api')) {
      return trimmed.substring(0, trimmed.length - 4);
    }
    return trimmed;
  }

  // API Endpoints
  static String get apiBaseUrl => '$normalizedBackendUrl/api';
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Cache
  static const Duration defaultCacheDuration = Duration(minutes: 5);
}
