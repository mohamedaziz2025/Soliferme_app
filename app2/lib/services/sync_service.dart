import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import './local_db_service.dart';
import 'tree_service.dart';
import 'package:http/http.dart' as http;
import './notification_service.dart';

class SyncResult {
  final bool success;
  final List<String> errors;

  SyncResult({
    required this.success,
    this.errors = const [],
  });
}

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  static const String baseUrl = 'http://localhost:3000/api';

  // reference to local database for offline support
  final LocalDatabase _localDb = LocalDatabase.instance;
  static const String lastSyncKey = 'last_sync_timestamp';
  final _notificationService = NotificationService();

  String? _authToken;
  DateTime? _lastSyncTimestamp;

  static const String _lastSyncKey = 'last_sync_timestamp';
  static const String _cachePrefix = 'cache_';

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
    final lastSyncStr = prefs.getString(lastSyncKey);
    if (lastSyncStr != null) {
      _lastSyncTimestamp = DateTime.parse(lastSyncStr);
    }
  }

  Future<bool> hasInternetConnection() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    return connectivityResult != ConnectivityResult.none;
  }

  Future<void> synchronizeAll() async {
    if (!await hasInternetConnection()) {
      throw Exception('Pas de connexion Internet');
    }

    if (_authToken == null) {
      throw Exception('Non authentifié');
    }

    try {
      // Sync local changes to server
      await _syncLocalChangesToServer();
      
      // Get server changes
      await _syncServerChangesToLocal();
      
      // Update last sync timestamp
      _lastSyncTimestamp = DateTime.now();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(lastSyncKey, _lastSyncTimestamp!.toIso8601String());
    } catch (e) {
      await _notificationService.showSyncErrorNotification(
        'Erreur de synchronisation: $e',
      );
      rethrow;
    }
  }

  Future<void> _syncLocalChangesToServer() async {
    // fetch pending events from local SQLite queue
    final pendingChanges = await _localDb.getPendingEvents();

for (final change in pendingChanges) {
        // pendingChanges already decoded maps
      
      try {
        final response = await http.post(
          Uri.parse('$baseUrl/sync/upload'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $_authToken',
          },
          body: json.encode(change),
        );

        if (response.statusCode == 200) {
          // remove from local queue
          await _localDb.deleteEvent(change['id']);
        } else {
          throw Exception('Échec de la synchronisation des modifications locales');
        }
      } catch (e) {
        await _notificationService.showSyncErrorNotification(
          'Erreur lors de l\'envoi des modifications: $e',
        );
        rethrow;
      }
    }
  }

  Future<void> _syncServerChangesToLocal() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/sync/download').replace(queryParameters: {
          'since': _lastSyncTimestamp?.toIso8601String() ?? '',
        }),
        headers: {
          'Authorization': 'Bearer $_authToken',
        },
      );

      if (response.statusCode == 200) {
        final changes = json.decode(response.body);
        await _applyServerChanges(changes);
      } else {
        throw Exception('Échec de la récupération des modifications du serveur');
      }
    } catch (e) {
      await _notificationService.showSyncErrorNotification(
        'Erreur lors de la récupération des modifications: $e',
      );
      rethrow;
    }
  }

  Future<void> _applyServerChanges(List<dynamic> changes) async {
    final prefs = await SharedPreferences.getInstance();
    
    for (final change in changes) {
      switch (change['type']) {
        case 'tree':
          final trees = json.decode(prefs.getString('trees') ?? '[]');
          _updateLocalData(trees, change['data'], change['id']);
          await prefs.setString('trees', json.encode(trees));
          break;
          
        case 'analysis':
          final analyses = json.decode(prefs.getString('analyses') ?? '[]');
          _updateLocalData(analyses, change['data'], change['id']);
          await prefs.setString('analyses', json.encode(analyses));
          break;
          
        case 'maintenance':
          final maintenance = json.decode(prefs.getString('maintenance') ?? '[]');
          _updateLocalData(maintenance, change['data'], change['id']);
          await prefs.setString('maintenance', json.encode(maintenance));
          break;
      }
    }
  }

  void _updateLocalData(List<dynamic> localData, Map<String, dynamic> serverData, String id) {
    final index = localData.indexWhere((item) => item['id'] == id);
    if (index != -1) {
      localData[index] = serverData;
    } else {
      localData.add(serverData);
    }
  }

  Future<void> synchronizeTreeAnalysis(String treeId) async {
    if (!await hasInternetConnection()) {
      throw Exception('Pas de connexion Internet');
    }

    if (_authToken == null) {
      throw Exception('Non authentifié');
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final analysisData = await _localDb.getAnalysis(treeId);
      
      if (analysisData != null) {
        final response = await http.post(
          Uri.parse('$baseUrl/trees/$treeId/analysis'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $_authToken',
          },
          body: analysisData,
        );

        if (response.statusCode == 200) {
          await prefs.remove('analysis_$treeId');
          await _notificationService.showTreeAnalysisComplete(
            treeId: treeId,
            title: 'Analyse terminée',
            body: 'L\'analyse de l\'arbre a été synchronisée avec succès',
          );
        } else {
          throw Exception('Échec de la synchronisation de l\'analyse');
        }
      }
    } catch (e) {
      await _notificationService.showSyncErrorNotification(
        'Erreur lors de la synchronisation de l\'analyse: $e',
      );
      rethrow;
    }
  }

  Future<void> queueLocalChange(String type, String id, Map<String, dynamic> data) async {
    // store the change in the SQLite event queue instead of SharedPreferences
    await _localDb.queueEvent(
      id,
      type,
      json.encode({
        'type': type,
        'id': id,
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      }),
    );
  }

  Future<Map<String, dynamic>?> getCachedTree(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final treesJson = prefs.getString('trees');
    if (treesJson != null) {
      final trees = List<Map<String, dynamic>>.from(json.decode(treesJson));
      return trees.firstWhere(
        (tree) => tree['id'] == id || tree['treeId'] == id,
        orElse: () => <String, dynamic>{},
      );
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> getCachedTrees() async {
    final prefs = await SharedPreferences.getInstance();
    final treesJson = prefs.getString('trees');
    if (treesJson != null) {
      return List<Map<String, dynamic>>.from(json.decode(treesJson));
    }
    return [];
  }

  Future<Map<String, dynamic>> getCachedStats() async {
    final prefs = await SharedPreferences.getInstance();
    final statsJson = prefs.getString('treeStats');
    if (statsJson != null) {
      return Map<String, dynamic>.from(json.decode(statsJson));
    }
    return {};
  }

  Future<Map<String, dynamic>> getCachedTreeAnalytics(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final analyticsJson = prefs.getString('treeAnalytics_$id');
    if (analyticsJson != null) {
      return Map<String, dynamic>.from(json.decode(analyticsJson));
    }
    return {};
  }

  Future<void> cacheTree(Map<String, dynamic> tree) async {
    if (tree['id'] == null && tree['treeId'] != null) {
      tree['id'] = tree['treeId'];
    }
    await cacheData('tree_${tree['id']}', tree);
    
    // Update trees list cache
    final trees = await getCachedTrees();
    final index = trees.indexWhere((t) => t['id'] == tree['id'] || t['treeId'] == tree['id']);
    if (index >= 0) {
      trees[index] = tree;
    } else {
      trees.add(tree);
    }
    await cacheData('all_trees', trees);
  }

  Future<void> addPendingCreate(Map<String, dynamic> treeData) async {
    final prefs = await SharedPreferences.getInstance();
    final pendingCreates = List<Map<String, dynamic>>.from(
      json.decode(prefs.getString('pendingCreates') ?? '[]')
    );
    pendingCreates.add(treeData);
    await prefs.setString('pendingCreates', json.encode(pendingCreates));
  }

  Future<void> addPendingUpdate(String id, Map<String, dynamic> updates) async {
    final prefs = await SharedPreferences.getInstance();
    final pendingUpdates = Map<String, dynamic>.from(
      json.decode(prefs.getString('pendingUpdates') ?? '{}')
    );
    pendingUpdates[id] = updates;
    await prefs.setString('pendingUpdates', json.encode(pendingUpdates));
  }

  Future<void> addPendingImage(String id, String imagePath) async {
    final prefs = await SharedPreferences.getInstance();
    final pendingImages = Map<String, List<String>>.from(
      json.decode(prefs.getString('pendingImages') ?? '{}')
    );
    if (!pendingImages.containsKey(id)) {
      pendingImages[id] = [];
    }
    pendingImages[id]!.add(imagePath);
    await prefs.setString('pendingImages', json.encode(pendingImages));
  }

  Future<void> cacheData(String key, dynamic data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_cachePrefix$key', json.encode(data));
  }

  Future<dynamic> getCachedData(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('$_cachePrefix$key');
    if (data != null) {
      return json.decode(data);
    }
    return null;
  }

  Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((key) => key.startsWith(_cachePrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  Future<Map<String, dynamic>?> getCachedTreeById(String id) async {
    return await getCachedData('tree_$id');
  }

  Future<bool> hasNetworkConnection() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    return connectivityResult != ConnectivityResult.none;
  }
}