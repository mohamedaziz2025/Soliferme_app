import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static final PermissionService _instance = PermissionService._internal();
  factory PermissionService() => _instance;
  PermissionService._internal();

  Future<bool> requestCameraPermission() async {
    if (kIsWeb) {
      // On web, we don't use permission_handler
      return true; // Web handles permissions through browser
    } else {
      final status = await Permission.camera.request();
      return status.isGranted;
    }
  }

  Future<bool> requestNotificationPermission() async {
    if (kIsWeb) {
      return true; // Web handles notifications differently
    } else {
      final status = await Permission.notification.request();
      return status.isGranted;
    }
  }

  Future<bool> checkCameraPermission() async {
    if (kIsWeb) {
      return true;
    } else {
      return await Permission.camera.isGranted;
    }
  }

  Future<bool> checkNotificationPermission() async {
    if (kIsWeb) {
      return true;
    } else {
      return await Permission.notification.isGranted;
    }
  }
}