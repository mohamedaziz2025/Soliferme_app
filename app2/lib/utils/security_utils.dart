import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'dart:math';

class SecurityUtils {
  static final Random _random = Random.secure();

  // Génère un sel aléatoire
  static String generateSalt([int length = 32]) {
    var values = List<int>.generate(length, (i) => _random.nextInt(256));
    return base64Url.encode(values);
  }

  // Hash un mot de passe avec un sel
  static String hashPassword(String password, String salt) {
    var bytes = utf8.encode(password + salt);
    var digest = sha256.convert(bytes);
    return digest.toString();
  }

  // Génère un token aléatoire
  static String generateToken([int length = 32]) {
    var values = List<int>.generate(length, (i) => _random.nextInt(256));
    return base64Url.encode(values);
  }

  // Vérifie si une chaîne est potentiellement dangereuse (injection SQL, XSS, etc.)
  static bool containsMaliciousContent(String input) {
    final maliciousPatterns = [
      RegExp(r"[<>]"), // Balises HTML
      RegExp(r"javascript:", caseSensitive: false), // JavaScript injection
      RegExp(r"(\b)(on\S+)(\s*)=", caseSensitive: false), // Event handlers
      RegExp(r"(;|\||&&|//|\\\\|\${)"), // Commandes shell
      RegExp(r"(select|insert|update|delete|drop|union|into|load_file)", 
        caseSensitive: false), // SQL injection
    ];

    return maliciousPatterns.any((pattern) => pattern.hasMatch(input));
  }

  // Sanitize les entrées utilisateur
  static String sanitizeInput(String input) {
    return input
      .replaceAll(RegExp(r"[<>]"), '')
      .replaceAll(RegExp(r"javascript:", caseSensitive: false), '')
      .replaceAll(RegExp(r"(\b)(on\S+)(\s*)=", caseSensitive: false), '')
      .replaceAll(RegExp(r"(;|\||&&|//|\\\\|\${})"), '');
  }

  // Valide un email
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  // Valide la force d'un mot de passe
  static Map<String, dynamic> validatePasswordStrength(String password) {
    final checks = {
      'length': password.length >= 8,
      'uppercase': password.contains(RegExp(r'[A-Z]')),
      'lowercase': password.contains(RegExp(r'[a-z]')),
      'numbers': password.contains(RegExp(r'[0-9]')),
      'special': password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]')),
    };

    final strength = checks.values.where((v) => v).length;
    final isValid = strength >= 4;

    return {
      'isValid': isValid,
      'strength': strength,
      'checks': checks,
    };
  }

  // Encode des données sensibles
  static String encodeSecret(String input) {
    final bytes = utf8.encode(input);
    return base64Url.encode(bytes);
  }

  // Décode des données sensibles
  static String decodeSecret(String encoded) {
    final bytes = base64Url.decode(encoded);
    return utf8.decode(bytes);
  }
}
