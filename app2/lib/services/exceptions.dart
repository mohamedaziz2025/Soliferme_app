class SyncException implements Exception {
  final String message;
  final String type;
  final dynamic originalError;

  SyncException(this.message, {this.type = 'general', this.originalError});

  @override
  String toString() => message;
}

class NetworkException extends SyncException {
  NetworkException(String message, {dynamic originalError}) 
    : super(message, type: 'network', originalError: originalError);
}

class ConflictException extends SyncException {
  final Map<String, dynamic> serverData;
  final Map<String, dynamic> localData;

  ConflictException(String message, {
    required this.serverData,
    required this.localData,
    dynamic originalError
  }) : super(message, type: 'conflict', originalError: originalError);
}
