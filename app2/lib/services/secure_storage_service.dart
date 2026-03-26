import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/services.dart';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'dart:convert';
import 'dart:typed_data';

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  
  final _storage = const FlutterSecureStorage();
  late encrypt.Encrypter _encrypter;
  late encrypt.IV _iv;
  bool _isInitialized = false;
  Future<void>? _initializationFuture;

  SecureStorageService._internal();

  Future<void> initialize() async {
    if (_isInitialized) return;
    if (_initializationFuture != null) {
      await _initializationFuture;
      return;
    }

    _initializationFuture = _initializeInternal();
    try {
      await _initializationFuture;
    } catch (e) {
      _initializationFuture = null;
      rethrow;
    }
  }

  Future<void> _initializeInternal() async {
    var keyString = await _safeRead('encryption_key');

    if (keyString == null) {
      // Generate a new key if missing or unrecoverable.
      final newKey = encrypt.Key.fromSecureRandom(32);
      keyString = base64.encode(newKey.bytes);
      await _storage.write(key: 'encryption_key', value: keyString);
    }

    Uint8List keyBytes;
    try {
      keyBytes = Uint8List.fromList(base64.decode(keyString));
    } catch (_) {
      // If stored key data is corrupted, replace it with a fresh key.
      final newKey = encrypt.Key.fromSecureRandom(32);
      keyString = base64.encode(newKey.bytes);
      await _storage.write(key: 'encryption_key', value: keyString);
      keyBytes = Uint8List.fromList(newKey.bytes);
    }

    final encryptKey = encrypt.Key(keyBytes);
    
    _iv = encrypt.IV.fromLength(16);
    _encrypter = encrypt.Encrypter(encrypt.AES(encryptKey));
    _isInitialized = true;
  }

  Future<void> saveSecure(String key, String value) async {
    await initialize();
    final encrypted = _encrypter.encrypt(value, iv: _iv);
    await _storage.write(key: key, value: encrypted.base64);
  }

  Future<String?> getSecure(String key) async {
    await initialize();
    final encrypted = await _safeRead(key);
    if (encrypted == null) return null;
    
    try {
      final decrypted = _encrypter.decrypt64(encrypted, iv: _iv);
      return decrypted;
    } catch (e) {
      // Remove value that cannot be decrypted to avoid repeated failures.
      await _storage.delete(key: key);
      return null;
    }
  }

  Future<String?> _safeRead(String key) async {
    try {
      return await _storage.read(key: key);
    } on PlatformException catch (e) {
      if (_isBadDecryptException(e)) {
        // Android keystore can invalidate old encrypted entries after reinstall,
        // backup restore, or biometric/security changes.
        await _storage.deleteAll();
        return null;
      }
      rethrow;
    }
  }

  bool _isBadDecryptException(PlatformException e) {
    final message = '${e.message ?? ''} ${e.details ?? ''} ${e.code}'.toLowerCase();
    return message.contains('bad_decrypt') ||
        message.contains('bad decrypt') ||
        message.contains('failed to unwrap key') ||
        message.contains('keystore') ||
        message.contains('invalidkey');
  }

  Future<void> deleteSecure(String key) async {
    await initialize();
    await _storage.delete(key: key);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // Méthode spécifique pour le token JWT
  Future<void> saveAuthToken(String token) async {
    await saveSecure('auth_token', token);
  }

  Future<String?> getAuthToken() async {
    return await getSecure('auth_token');
  }

  Future<void> removeAuthToken() async {
    await deleteSecure('auth_token');
  }
}
