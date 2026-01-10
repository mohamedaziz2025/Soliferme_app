import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import './exceptions.dart';
import './auth_service.dart';
import './notification_service.dart';

class SyncConfig {
  final Duration syncInterval;
  final int maxRetries;
  final Duration retryDelay;
  final bool requireWifi;
  final bool requireCharging;

  const SyncConfig({
    this.syncInterval = const Duration(hours: 6),
    this.maxRetries = 3,
    this.retryDelay = const Duration(minutes: 5),
    this.requireWifi = false,
    this.requireCharging = false,
  });
}

class SyncManager {
  static final SyncManager _instance = SyncManager._internal();
  factory SyncManager() => _instance;
  SyncManager._internal();

  final _syncController = StreamController<SyncEvent>.broadcast();
  Timer? _syncTimer;
  bool _isSyncing = false;
  int _retryCount = 0;
  final _notificationService = NotificationService();
  
  Stream<SyncEvent> get syncEvents => _syncController.stream;

  Future<void> initialize(SyncConfig config) async {
    await _setupPeriodicSync(config);
    _setupConnectivityListener();
  }

  Future<void> _setupPeriodicSync(SyncConfig config) async {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(config.syncInterval, (_) {
      performSync(config: config);
    });
  }

  void _setupConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none) {
        // Tenter une synchronisation quand la connexion est rétablie
        performSync();
      }
    });
  }

  Future<void> performSync({SyncConfig? config}) async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      // Vérifier les conditions de synchronisation
      if (!await _checkSyncConditions(config)) {
        return;
      }

      await _syncData();
      _retryCount = 0;
      _syncController.add(SyncEvent(status: SyncStatus.completed));
      
    } on NetworkException catch (e) {
      _handleSyncError(e, config);
    } on ConflictException catch (e) {
      await _handleConflict(e);
    } catch (e) {
      _syncController.add(SyncEvent(
        status: SyncStatus.error,
        error: e.toString(),
      ));
    } finally {
      _isSyncing = false;
    }
  }

  Future<bool> _checkSyncConditions(SyncConfig? config) async {
    if (config == null) return true;

    final connectivity = await Connectivity().checkConnectivity();
    
    if (config.requireWifi && connectivity != ConnectivityResult.wifi) {
      return false;
    }

    // Ajouter d'autres vérifications si nécessaire
    return true;
  }

  Future<void> _handleSyncError(NetworkException error, SyncConfig? config) async {
    if (config != null && _retryCount < config.maxRetries) {
      _retryCount++;
      await Future.delayed(config.retryDelay);
      await performSync(config: config);
    } else {
      _notificationService.showSyncErrorNotification(
        'Erreur de synchronisation: ${error.message}',
      );
      _syncController.add(SyncEvent(
        status: SyncStatus.error,
        error: error.toString(),
      ));
    }
  }

  Future<void> _handleConflict(ConflictException conflict) async {
    // Implémenter la stratégie de résolution de conflits
    // Par exemple, garder la version la plus récente
    _syncController.add(SyncEvent(
      status: SyncStatus.conflict,
      error: conflict.toString(),
    ));
  }

  void dispose() {
    _syncTimer?.cancel();
    _syncController.close();
  }
}

enum SyncStatus { started, completed, error, conflict }

class SyncEvent {
  final SyncStatus status;
  final String? error;

  SyncEvent({required this.status, this.error});
}
