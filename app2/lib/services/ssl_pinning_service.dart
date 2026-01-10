import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/io_client.dart';

class SSLPinningService {
  static final SSLPinningService _instance = SSLPinningService._internal();
  factory SSLPinningService() => _instance;
  SSLPinningService._internal();

  HttpClient? _client;
  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    _client = HttpClient()
      ..badCertificateCallback = (X509Certificate cert, String host, int port) {
        // En production, vérifier le certificat avec une liste de certificats valides
        if (kDebugMode) {
          return true; // Accepter tous les certificats en mode debug
        }
        
        // Exemple de vérification de certificat en production
        final trustedFingerprints = [
          "AA:BB:CC:DD:EE", // Remplacer par les empreintes de vos certificats
        ];
        
        final fingerprint = cert.fingerprint;
        return trustedFingerprints.contains(fingerprint);
      };

    _isInitialized = true;
  }

  HttpClient get client {
    if (!_isInitialized) {
      throw StateError('SSLPinningService non initialisé');
    }
    return _client!;
  }

  IOClient getIOClient() {
    return IOClient(client);
  }
}
