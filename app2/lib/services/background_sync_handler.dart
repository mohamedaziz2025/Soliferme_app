import 'package:workmanager/workmanager.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import './sync_service.dart';
import './notification_service.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      switch (task) {
        case 'syncData':
          final syncService = SyncService();
          await syncService.initialize();
          await syncService.synchronizeAll();
          break;
          
        case 'syncTreeAnalysis':
          if (inputData != null && inputData.containsKey('treeId')) {
            final syncService = SyncService();
            await syncService.initialize();
            await syncService.synchronizeTreeAnalysis(inputData['treeId']);
          }
          break;
      }
      return true;
    } catch (e) {
      final notificationService = NotificationService();
      await notificationService.initialize();
      await notificationService.showSyncErrorNotification(
        'Une erreur est survenue lors de la synchronisation: $e',
      );
      return false;
    }
  });
}

class BackgroundSyncHandler {
  static final BackgroundSyncHandler _instance = BackgroundSyncHandler._internal();
  factory BackgroundSyncHandler() => _instance;
  BackgroundSyncHandler._internal();

  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );
  }

  Future<void> schedulePeriodicSync({
    Duration frequency = const Duration(hours: 6),
  }) async {
    await Workmanager().registerPeriodicTask(
      'periodicSync',
      'syncData',
      frequency: frequency,
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresBatteryNotLow: true,
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep,
    );
  }

  Future<void> scheduleOneTimeSync() async {
    await Workmanager().registerOneOffTask(
      'oneTimeSync',
      'syncData',
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      existingWorkPolicy: ExistingWorkPolicy.replace,
    );
  }

  Future<void> scheduleTreeAnalysisSync(String treeId) async {
    await Workmanager().registerOneOffTask(
      'treeAnalysisSync_$treeId',
      'syncTreeAnalysis',
      inputData: {'treeId': treeId},
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      existingWorkPolicy: ExistingWorkPolicy.replace,
    );
  }

  Future<void> cancelAllTasks() async {
    await Workmanager().cancelAll();
  }

  Future<void> cancelSpecificTask(String uniqueName) async {
    await Workmanager().cancelByUniqueName(uniqueName);
  }
}