import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'dart:convert';

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  
  final _storage = const FlutterSecureStorage();
  late encrypt.Encrypter _encrypter;
  late encrypt.IV _iv;

  SecureStorageService._internal();

  Future<void> initialize() async {
    final key = await _storage.read(key: 'encryption_key');
    if (key == null) {
      // Générer une nouvelle clé si elle n'existe pas
      final newKey = encrypt.Key.fromSecureRandom(32);
      await _storage.write(
        key: 'encryption_key',
        value: base64.encode(newKey.bytes),
      );
    }

    final keyString = await _storage.read(key: 'encryption_key');
    final keyBytes = base64.decode(keyString!);
    final encryptKey = encrypt.Key(keyBytes);
    
    _iv = encrypt.IV.fromLength(16);
    _encrypter = encrypt.Encrypter(encrypt.AES(encryptKey));
  }

  Future<void> saveSecure(String key, String value) async {
    final encrypted = _encrypter.encrypt(value, iv: _iv);
    await _storage.write(key: key, value: encrypted.base64);
  }

  Future<String?> getSecure(String key) async {
    final encrypted = await _storage.read(key: key);
    if (encrypted == null) return null;
    
    try {
      final decrypted = _encrypter.decrypt64(encrypted, iv: _iv);
      return decrypted;
    } catch (e) {
      return null;
    }
  }

  Future<void> deleteSecure(String key) async {
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
