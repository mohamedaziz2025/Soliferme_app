import 'dart:io';
import './api_service.dart';

class AnalysisService {
  static final AnalysisService _instance = AnalysisService._internal();
  factory AnalysisService() => _instance;
  AnalysisService._internal();

  final ApiService _apiService = ApiService();
  bool _initialized = false;

  Future<void> initialize() async {
    _initialized = true;
  }

  Map<String, dynamic> _extractAnalysisPayload(Map<String, dynamic> result) {
    final analysis = result['analysis'];
    if (analysis is Map<String, dynamic>) {
      return analysis;
    }

    final aiAnalysis = result['aiAnalysis'];
    if (aiAnalysis is Map<String, dynamic>) {
      return {
        'diseaseDetection': aiAnalysis['diseaseDetection'],
        'treeAnalysis': aiAnalysis['treeAnalysis'],
      };
    }

    return result;
  }

  Future<Map<String, dynamic>> createRemoteAnalysis({
    required File imageFile,
    required String treeType,
    required Map<String, dynamic> gpsData,
    Map<String, dynamic>? measurements,
    String? notes,
  }) async {
    if (!_initialized) {
      await initialize();
    }

    return _apiService.createAnalysisWithAI(
      imageFile: imageFile,
      treeType: treeType,
      gpsData: gpsData,
      measurements: measurements,
      notes: notes,
    );
  }

  // Legacy signature kept for backward compatibility.
  Future<Map<String, dynamic>> analyzeTreeHealth(
    String imagePath,
    String treeId, {
    String? treeType,
    Map<String, dynamic>? gpsData,
    Map<String, dynamic>? measurements,
    String? notes,
  }) async {
    final normalizedTreeType = treeType?.trim();
    final hasCoords = gpsData != null &&
        gpsData['latitude'] != null &&
        gpsData['longitude'] != null;

    if (normalizedTreeType == null || normalizedTreeType.isEmpty || !hasCoords) {
      throw Exception(
        'Remote AI analysis requires treeType and gpsData {latitude, longitude}.',
      );
    }

    final response = await createRemoteAnalysis(
      imageFile: File(imagePath),
      treeType: normalizedTreeType,
      gpsData: gpsData!,
      measurements: measurements,
      notes: notes,
    );

    return _extractAnalysisPayload(response);
  }

  Future<Map<String, dynamic>?> getLastAnalysis(String treeId) async {
    try {
      final analyses = await _apiService.getAnalysesByTreeId(treeId);
      if (analyses.isEmpty) {
        return null;
      }

      final latest = analyses.first;
      if (latest is Map<String, dynamic>) {
        return latest;
      }

      if (latest is Map) {
        return Map<String, dynamic>.from(latest);
      }

      return <String, dynamic>{};
    } catch (e) {
      print('Error retrieving analysis: $e');
      return null;
    }
  }

  void dispose() {}
}