import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import './api_service.dart';

class TreeService {
  final ApiService _apiService;

  TreeService(this._apiService);

  Future<Map<String, dynamic>> getTreeById(String id) async {
    return await _apiService.getTreeById(id);
  }

  Future<List<Map<String, dynamic>>> getAllTrees() async {
    final dynamic response = await _apiService.getAllTrees();
    if (response is Map<String, dynamic>) {
      if (response.containsKey('trees')) {
        return List<Map<String, dynamic>>.from(response['trees'] as List);
      }
      return [response];
    }
    return List<Map<String, dynamic>>.from(response as List);
  }

  Future<Map<String, dynamic>> getTreeStats() async {
    return await _apiService.getTreeStats();
  }

  Future<Map<String, dynamic>> getTreeAnalytics(String id) async {
    return await _apiService.getTreeAnalytics(id);
  }

  Future<Map<String, dynamic>> createTree(Map<String, dynamic> treeData) async {
    // Ensure proper number types before sending
    if (treeData['measurements'] != null) {
      treeData['measurements']['height'] = double.tryParse(treeData['measurements']['height'].toString()) ?? 0.0;
      treeData['measurements']['width'] = double.tryParse(treeData['measurements']['width'].toString()) ?? 0.0;
    }
    final response = await _apiService.createTree(treeData);
    return response;
  }

  Future<Map<String, dynamic>> addTree(Map<String, dynamic> treeData) async {
    return await createTree(treeData);
  }

  Future<Map<String, dynamic>> updateTree(String id, Map<String, dynamic> updates) async {
    // Ensure proper number types before sending
    if (updates['measurements'] != null) {
      updates['measurements']['height'] = double.tryParse(updates['measurements']['height'].toString()) ?? 0.0;
      updates['measurements']['width'] = double.tryParse(updates['measurements']['width'].toString()) ?? 0.0;
    }
    final response = await _apiService.updateTree(id, updates);
    return response;
  }

  Future<Map<String, dynamic>> archiveTree(String id) async {
    return await _apiService.archiveTree(id);
  }

  Future<Map<String, dynamic>> restoreTree(String id) async {
    return await _apiService.restoreTree(id);
  }

  Future<Map<String, dynamic>> getTreesByOwnerEmail(String email) async {
    return await _apiService.getTreesByOwnerEmail(email);
  }

  Future<Map<String, dynamic>> getTreeFromQRData(String qrData) async {
    try {
      final data = json.decode(qrData);
      // If QR contains only ID, get complete data
      if (data is Map<String, dynamic> && data.containsKey('id')) {
        return await getTreeById(data['id']);
      }
      // Otherwise, use QR data directly
      return data;
    } catch (e) {
      throw Exception('Invalid QR code: $e');
    }
  }

  Future<Map<String, dynamic>> uploadTreeImage(String id, File image) async {
    try {
      final uri = Uri.parse('${ApiService.baseUrl}/trees/$id/images');
      final request = http.MultipartRequest('POST', uri);
      
      final headers = await _apiService.getHeaders();
      request.headers.addAll(headers);
      
      request.files.add(await http.MultipartFile.fromPath(
        'image',
        image.path,
      ));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);      if (response.statusCode == 200) {
        final updatedTree = json.decode(response.body);
        return Map<String, dynamic>.from(updatedTree);
      } else {
        throw Exception('Failed to upload image');
      }
    } catch (e) {
      throw Exception('Error uploading image: $e');
    }
  }
}