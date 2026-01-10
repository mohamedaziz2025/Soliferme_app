import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import './permission_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  final PermissionService _permissionService = PermissionService();
  
  Future<void> initialize() async {
    tz.initializeTimeZones();
    
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Request permissions on initialization
    await requestPermissions();
  }

  Future<void> _onNotificationTapped(NotificationResponse response) async {
    if (response.payload != null) {
      print('Notification tapped with payload: ${response.payload}');
    }
  }

  Future<bool> requestPermissions() async {
    return await _permissionService.requestNotificationPermission();
  }

  Future<void> showHealthAlert({
    required String treeId,
    required String title,
    required String body,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'health_alerts',
      'Health Alerts',
      channelDescription: 'Alerts about tree health issues',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      treeId.hashCode,
      title,
      body,
      details,
      payload: 'tree:$treeId:health',
    );
  }

  Future<void> scheduleMaintenance({
    required String treeId,
    required String title,
    required String body,
    required DateTime scheduledDate,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'maintenance_reminders',
      'Maintenance Reminders',
      channelDescription: 'Reminders for tree maintenance tasks',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.zonedSchedule(
      'maintenance_$treeId'.hashCode,
      title,
      body,
      tz.TZDateTime.from(scheduledDate, tz.local),
      details,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      payload: 'tree:$treeId:maintenance',
    );
  }

  Future<void> showSyncErrorNotification(String message) async {
    const androidDetails = AndroidNotificationDetails(
      'sync_errors',
      'Sync Errors',
      channelDescription: 'Notifications about synchronization errors',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      'sync_error'.hashCode,
      'Erreur de synchronisation',
      message,
      details,
    );
  }

  Future<void> showTreeAnalysisComplete({
    required String treeId,
    required String title,
    required String body,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'analysis_complete',
      'Analysis Complete',
      channelDescription: 'Notifications when tree analysis is complete',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      'analysis_$treeId'.hashCode,
      title,
      body,
      details,
      payload: 'tree:$treeId:analysis',
    );
  }

  Future<void> cancelNotification(int id) async {
    await _notifications.cancel(id);
  }

  Future<void> cancelAllNotifications() async {
    await _notifications.cancelAll();
  }

  Future<void> clearBadge() async {
    await _notifications.cancelAll();
  }

  Future<bool> areNotificationsEnabled() async {
    return await _permissionService.checkNotificationPermission();
  }

  Future<bool> setNotificationsEnabled(bool enabled) async {
    if (enabled) {
      return await requestPermissions();
    } else {
      await _notifications.cancelAll();
      return true;
    }
  }
}