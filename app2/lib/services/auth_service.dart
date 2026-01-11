import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import './api_exception.dart';
import './secure_storage_service.dart';

class AuthService extends ChangeNotifier {
  // Use hosted backend URL
  static String get baseUrl => AppConfig.apiBaseUrl;
    
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  String? _token;
  Map<String, dynamic>? _userData;
  bool _isAdmin = false;
  final SecureStorageService _secureStorage = SecureStorageService();
  DateTime? _tokenExpiry;

  String? get token => _token;
  Map<String, dynamic>? get userData => _userData;
  Map<String, dynamic>? get currentUser => _userData; // Added getter for currentUser
  bool get isAdmin => _isAdmin;
  String? get role => _userData?['role'];
  String? get email => _userData?['email'];  // Added email getter

  // Singleton instance
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(tokenKey);
      final userDataStr = prefs.getString(userKey);
      
      if (userDataStr != null) {
        _userData = json.decode(userDataStr);
        _isAdmin = _userData?['role'] == 'admin';
      }

      // Validate token if it exists
      if (_token != null) {
        final isValid = await _validateToken();
        if (!isValid) {
          await logout();
        }
      }

      notifyListeners();
    } catch (e) {
      print('Error during initialization: $e');
      await logout();
    }
  }

  Future<String?> getToken() async {
    if (_token == null) {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(tokenKey);
    }
    return _token;
  }

  Future<bool> _validateToken() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/profile'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Content-Type': 'application/json',
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> isAuthenticated() async {
    if (_token == null) {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(tokenKey);
      final userDataStr = prefs.getString(userKey);
      if (userDataStr != null) {
        _userData = json.decode(userDataStr);
        _isAdmin = _userData?['role'] == 'admin';
      }
    }

    if (_token == null) return false;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/profile'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Content-Type': 'application/json',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Auth verification error: $e');
      return false;
    }
  }

  Future<void> login(String email, String password) async {
    try {
      final loginUrl = '$baseUrl/auth/login';
      print('DEBUG: Login URL: $loginUrl'); // Debug log
      print('DEBUG: kIsWeb: $kIsWeb'); // Debug log
      
      final response = await http.post(
        Uri.parse(loginUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      print('DEBUG: Response status: ${response.statusCode}'); // Debug log
      print('DEBUG: Response body: ${response.body}'); // Debug log

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _token = data['token'];
        _userData = data['user'];
        _isAdmin = _userData?['role'] == 'admin';

        // Save to local storage
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(tokenKey, _token!);
        await prefs.setString(userKey, json.encode(_userData));

        notifyListeners();
      } else {
        final error = json.decode(response.body);
        throw ApiException(
          error['message'] ?? 'Login failed',
          response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Login failed: $e', 500);
    }
  }

  Future<void> logout() async {
    _token = null;
    _userData = null;
    _isAdmin = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(tokenKey);
    await prefs.remove(userKey);

    notifyListeners();
  }

  Future<void> register(String name, String email, String password, String language) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'name': name,
          'email': email,
          'password': password,
          'language': language,
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        _token = data['token'];
        _userData = data['user'];
        _isAdmin = _userData?['role'] == 'admin';
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(tokenKey, _token!);
        await prefs.setString(userKey, json.encode(_userData));
        
        notifyListeners();
      } else {
        final error = json.decode(response.body);
        throw ApiException(
          error['message'] ?? 'Registration failed',
          response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Registration error: $e', 500);
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> updates) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/auth/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: json.encode(updates),
      );

      if (response.statusCode == 200) {
        final updatedUser = json.decode(response.body);
        _userData = updatedUser;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(userKey, json.encode(_userData));

        notifyListeners();
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  Future<List<dynamic>> getAllUsers() async {
    if (!_isAdmin) throw ApiException('Unauthorized', 403);
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/users'),
        headers: {
          'Authorization': 'Bearer $_token',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      throw ApiException('Failed to fetch users', response.statusCode);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error fetching users: $e', 500);
    }
  }

  Future<void> createUser(Map<String, dynamic> userData) async {
    if (!_isAdmin) throw ApiException('Unauthorized', 403);
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/users'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: json.encode(userData),
      );

      if (response.statusCode != 201) {
        final error = json.decode(response.body);
        throw ApiException(
          error['message'] ?? 'Failed to create user',
          response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error creating user: $e', 500);
    }
  }

  Future<void> refreshToken() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _token = data['token'];
        _userData = data['user'];
        _isAdmin = _userData?['role'] == 'admin';

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(tokenKey, _token!);
        await prefs.setString(userKey, json.encode(_userData));

        notifyListeners();
      } else {
        throw ApiException('Failed to refresh token', response.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Token refresh failed: $e', 500);
    }
  }

  Future<void> updateUserRole(String userId, String newRole) async {
    if (!_isAdmin) throw ApiException('Unauthorized', 403);
    
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/auth/users/$userId/role'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: json.encode({'role': newRole}),
      );

      if (response.statusCode != 200) {
        final error = json.decode(response.body);
        throw ApiException(
          error['message'] ?? 'Failed to update user role',
          response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error updating user role: $e', 500);
    }
  }

  // Mise à jour complète d'un utilisateur par un administrateur
  Future<void> updateUserByAdmin(String userId, Map<String, dynamic> updates) async {
    if (!_isAdmin) throw ApiException('Unauthorized', 403);

    try {
      final response = await http.put(
        Uri.parse('$baseUrl/auth/users/$userId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: json.encode(updates),
      );

      if (response.statusCode != 200) {
        final error = json.decode(response.body);
        throw ApiException(
          error['message'] ?? 'Failed to update user',
          response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error updating user: $e', 500);
    }
  }
}