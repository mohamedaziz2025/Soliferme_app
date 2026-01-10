import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import './auth_service.dart';
import './sync_service.dart';
import './network_service.dart';
import './api_exception.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Use your actual backend URL here
  static const String baseUrl = kIsWeb 
    ? 'http://localhost:5000/api'
    : 'http://10.0.2.2:5000/api';  // For Android emulator

  final SyncService _syncService = SyncService();
  final NetworkService _networkService = NetworkService();

  Future<Map<String, String>> getHeaders() async {
    final authService = AuthService();
    final token = await authService.getToken();
    
    if (token == null) {
      throw ApiException('No authentication token found', 401);
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<void> refreshToken() async {
    final authService = AuthService();
    await authService.refreshToken();
  }

  Future<dynamic> _handleRequest<T>({
    required Future<http.Response> Function() request,
    String? cacheKey,
    Duration cacheDuration = const Duration(minutes: 5),
  }) async {
    if (!await _networkService.isOnline()) {
      if (cacheKey != null) {
        final cachedData = await _syncService.getCachedData(cacheKey);
        if (cachedData != null) {
          return cachedData;
        }
      }
      throw ApiException('No network connection', 503);
    }

    try {
      final response = await request();
      
      switch (response.statusCode) {
        case 200:
        case 201:
          final data = json.decode(response.body);
          if (cacheKey != null) {
            await _syncService.cacheData(cacheKey, data);
          }
          return data;
        case 401:
          // Token expired, try to refresh
          await refreshToken();
          final retryResponse = await request();
          if (retryResponse.statusCode == 200 || retryResponse.statusCode == 201) {
            final data = json.decode(retryResponse.body);
            if (cacheKey != null) {
              await _syncService.cacheData(cacheKey, data);
            }
            return data;
          }
          throw ApiException('Authentication failed', 401);
        default:
          throw ApiException(
            'Request failed: ${response.statusCode}',
            response.statusCode,
          );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 500);
    }
  }
  Future<dynamic> getAllTrees() async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/trees'),
        headers: await getHeaders(),
      ),
      cacheKey: 'all_trees',
    );
    return response;
  }
  Future<Map<String, dynamic>> getTreeStats() async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/trees/stats'),
        headers: await getHeaders(),
      ),
      cacheKey: 'tree_stats',
    );
    return Map<String, dynamic>.from(response);
  }
  Future<Map<String, dynamic>> getTreeById(String id) async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/trees/$id'),
        headers: await getHeaders(),
      ),
      cacheKey: 'tree_$id',
    );
    return Map<String, dynamic>.from(response);
  }
  Future<Map<String, dynamic>> getTreeAnalytics(String id) async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/trees/$id/analytics'),
        headers: await getHeaders(),
      ),
      cacheKey: 'tree_analytics_$id',
    );
    return Map<String, dynamic>.from(response);
  }

  // Dashboard stats used by the Flutter dashboard screen
  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/dashboard'),
        headers: await getHeaders(),
      ),
      cacheKey: 'dashboard_stats',
    );
    return Map<String, dynamic>.from(response);
  }

  Future<Map<String, dynamic>> createTree(Map<String, dynamic> treeData) async {
    if (!await _networkService.isOnline()) {
      await _syncService.addPendingCreate(treeData);
      return {
        ...treeData,
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'isPending': true
      };
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/trees'),
        headers: await getHeaders(),
        body: json.encode(treeData),
      );

      switch (response.statusCode) {
        case 201:
          final newTree = json.decode(response.body);
          await _syncService.cacheTree(newTree);
          return newTree;
        case 401:
          final authService = AuthService();          await authService.refreshToken();
          final retryResponse = await (() async {
            return await http.post(
              Uri.parse('$baseUrl/trees'),
              headers: await getHeaders(),
              body: json.encode(treeData),
            );
          })();
          if (retryResponse.statusCode == 201) {
            final newTree = json.decode(retryResponse.body);
            await _syncService.cacheTree(newTree);
            return newTree;
          }
          throw ApiException('Authentication failed', 401);
        default:
          String? details;
          try {
            final errorData = json.decode(response.body);
            details = errorData['message'] ?? errorData['error'];
          } catch (_) {}
          throw ApiException.fromStatusCode(response.statusCode, details: details);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Failed to create tree: $e', 500);
    }
  }
  Future<Map<String, dynamic>> updateTree(String id, Map<String, dynamic> updates) async {
    // Ensure measurements are properly formatted before sending
    if (updates['measurements'] != null) {
      final measurements = updates['measurements'];
      updates['measurements'] = {
        'height': double.tryParse(measurements['height'].toString()) ?? 0.0,
        'width': double.tryParse(measurements['width'].toString()) ?? 0.0,
        'approximateShape': measurements['approximateShape'] ?? '',
      };
    }
    final response = await _handleRequest(
      request: () async => http.put(
        Uri.parse('$baseUrl/trees/$id'),
        headers: await getHeaders(),
        body: json.encode(updates),
      ),
      cacheKey: 'tree_update_$id',
    );
    return Map<String, dynamic>.from(response);
  }
  Future<Map<String, dynamic>> archiveTree(String id) async {
    final response = await _handleRequest(
      request: () async => http.put(
        Uri.parse('$baseUrl/trees/$id/archive'),
        headers: await getHeaders(),
      ),
    );
    return Map<String, dynamic>.from(response);
  }

  Future<Map<String, dynamic>> restoreTree(String id) async {
    final response = await _handleRequest(
      request: () async => http.put(
        Uri.parse('$baseUrl/trees/$id/restore'),
        headers: await getHeaders(),
      ),
    );
    return Map<String, dynamic>.from(response);
  }
  Future<Map<String, dynamic>> getTreesByOwnerEmail(String email) async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/trees/owner/${Uri.encodeComponent(email)}'),
        headers: await getHeaders(),
      ),
      cacheKey: 'trees_by_owner_$email',
    );
    return Map<String, dynamic>.from(response);
  }

  // Analysis APIs
  Future<Map<String, dynamic>> createAnalysisWithGPS(Map<String, dynamic> analysisData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/analysis/create-with-gps'),
        headers: await getHeaders(),
        body: json.encode(analysisData),
      );

      if (response.statusCode == 201) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        await refreshToken();
        final retryResponse = await http.post(
          Uri.parse('$baseUrl/analysis/create-with-gps'),
          headers: await getHeaders(),
          body: json.encode(analysisData),
        );
        if (retryResponse.statusCode == 201) {
          return json.decode(retryResponse.body);
        }
        throw ApiException('Authentication failed', 401);
      } else {
        throw ApiException('Failed to create analysis: ${response.statusCode}', response.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 500);
    }
  }

  Future<List<dynamic>> getAllAnalyses() async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/analysis'),
        headers: await getHeaders(),
      ),
      cacheKey: 'all_analyses',
    );
    return List<dynamic>.from(response);
  }

  Future<List<dynamic>> getAnalysesByTreeId(String treeId) async {
    final response = await _handleRequest(
      request: () async => http.get(
        Uri.parse('$baseUrl/analysis/tree/$treeId'),
        headers: await getHeaders(),
      ),
      cacheKey: 'analyses_tree_$treeId',
    );
    return List<dynamic>.from(response);
  }

  Future<Map<String, dynamic>> getAnalysisHistory({
    String? startDate,
    String? endDate,
    String? treeType,
    String? severity,
  }) async {
    final queryParams = <String, String>{};
    if (startDate != null) queryParams['startDate'] = startDate;
    if (endDate != null) queryParams['endDate'] = endDate;
    if (treeType != null) queryParams['treeType'] = treeType;
    if (severity != null) queryParams['severity'] = severity;

    final uri = Uri.parse('$baseUrl/analysis/history').replace(queryParameters: queryParams);
    
    final response = await _handleRequest(
      request: () async => http.get(uri, headers: await getHeaders()),
      cacheKey: 'analysis_history',
    );
    return Map<String, dynamic>.from(response);
  }
}