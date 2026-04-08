class AppConfig {
  // URL configurable via --dart-define=BACKEND_URL / AI_SERVICE_URL
  // Defaults are local-friendly for Android emulator + local Docker.
  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://10.0.2.2:35000',
  );

  static const String aiServiceUrl = String.fromEnvironment(
    'AI_SERVICE_URL',
    defaultValue: 'http://10.0.2.2:5001',
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
