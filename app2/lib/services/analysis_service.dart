import 'dart:io';
import 'package:tflite_flutter/tflite_flutter.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import './notification_service.dart';
import './sync_service.dart';

class AnalysisService {
  static final AnalysisService _instance = AnalysisService._internal();
  factory AnalysisService() => _instance;
  AnalysisService._internal();

  late Interpreter _interpreter;
  final NotificationService _notificationService = NotificationService();
  final SyncService _syncService = SyncService();

  Future<void> initialize() async {
    try {
      _interpreter = await Interpreter.fromAsset('assets/models/tree_health_model.tflite');
    } catch (e) {
      print('Error loading model: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> analyzeTreeHealth(String imagePath, String treeId) async {
    try {
      // Load and preprocess the image
      final imageBytes = File(imagePath).readAsBytesSync();
      final image = img.decodeImage(imageBytes)!;
      final resizedImage = img.copyResize(image, width: 224, height: 224);
      
      // Convert image to float32 array and normalize
      var input = List.generate(
        1,
        (index) => List.generate(
          224,
          (y) => List.generate(
            224,
            (x) {
              var pixel = resizedImage.getPixel(x, y);
              return [
                img.getRed(pixel) / 255.0,
                img.getGreen(pixel) / 255.0,
                img.getBlue(pixel) / 255.0,
              ];
            },
          ),
        ),
      );

      // Prepare output tensor
      var output = List.filled(1 * 5, 0).reshape([1, 5]); // 5 classes

      // Run inference
      _interpreter.run(input, output);

      // Process results
      final results = _processResults(output[0]);
      
      // Save analysis results
      await _saveAnalysisResults(treeId, results);
      
      // Notify if health issues detected
      if (results['health_score'] < 0.7) {
        await _notificationService.showTreeHealthAlert(
          treeId: treeId,
          healthIssue: results['primary_issue'],
          severity: results['severity'],
        );
      }

      // Queue for sync
      await _syncService.queueLocalChange(
        'analysis',
        treeId,
        results,
      );

      return results;
    } catch (e) {
      print('Error during analysis: $e');
      rethrow;
    }
  }

  Map<String, dynamic> _processResults(List<dynamic> output) {
    final List<String> healthLabels = [
      'healthy',
      'nutrient_deficiency',
      'pest_infestation',
      'disease',
      'water_stress'
    ];

    // Find highest probability and its index
    int maxIndex = 0;
    double maxProb = output[0];
    for (int i = 1; i < output.length; i++) {
      if (output[i] > maxProb) {
        maxProb = output[i];
        maxIndex = i;
      }
    }

    // Calculate overall health score (inverse of problem probability)
    double healthScore = healthLabels[maxIndex] == 'healthy' 
        ? maxProb 
        : 1 - maxProb;

    // Determine severity level
    String severity = 'low';
    if (healthScore < 0.3) severity = 'high';
    else if (healthScore < 0.7) severity = 'medium';

    return {
      'timestamp': DateTime.now().toIso8601String(),
      'health_score': healthScore,
      'primary_issue': healthLabels[maxIndex],
      'severity': severity,
      'confidence': maxProb,
      'all_probabilities': Map.fromIterables(healthLabels, output),
    };
  }

  Future<void> _saveAnalysisResults(String treeId, Map<String, dynamic> results) async {
    final directory = await getApplicationDocumentsDirectory();
    final file = File('${directory.path}/analysis_$treeId.json');
    await file.writeAsString(results.toString());
  }

  Future<Map<String, dynamic>?> getLastAnalysis(String treeId) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/analysis_$treeId.json');
      
      if (await file.exists()) {
        final contents = await file.readAsString();
        // Parse the string back to Map
        return Map<String, dynamic>.from(eval(contents));
      }
      return null;
    } catch (e) {
      print('Error retrieving analysis: $e');
      return null;
    }
  }

  void dispose() {
    _interpreter.close();
  }
}