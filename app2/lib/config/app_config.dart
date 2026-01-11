class AppConfig {
  // Backend hébergé
  static const String backendUrl = 'http://72.62.71.97:35000';
  static const String aiServiceUrl = 'http://72.62.71.97:5001';
  
  // API Endpoints
  static const String apiBaseUrl = '$backendUrl/api';
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Cache
  static const Duration defaultCacheDuration = Duration(minutes: 5);
}
