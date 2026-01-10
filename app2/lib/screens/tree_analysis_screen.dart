import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/permission_service.dart';

class TreeAnalysisScreen extends StatefulWidget {
  const TreeAnalysisScreen({Key? key}) : super(key: key);

  @override
  State<TreeAnalysisScreen> createState() => _TreeAnalysisScreenState();
}

class _TreeAnalysisScreenState extends State<TreeAnalysisScreen> {
  final _formKey = GlobalKey<FormState>();
  final _treeTypeController = TextEditingController();
  final _notesController = TextEditingController();
  
  File? _capturedImage;
  Position? _currentPosition;
  bool _isAnalyzing = false;
  bool _isLoadingGPS = false;
  
  Map<String, dynamic>? _analysisResult;
  
  final ImagePicker _picker = ImagePicker();
  
  final List<String> _treeTypes = [
    'Olivier',
    'Citronnier',
    'Oranger',
    'Pommier',
    'Poirier',
    'Cerisier',
    'Figuier',
    'Grenadier',
    'Amandier',
    'Vigne',
    'Autre'
  ];

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingGPS = true;
    });

    try {
      final permissionService = Provider.of<PermissionService>(context, listen: false);
      
      // Check location permission
      bool hasPermission = await permissionService.checkLocationPermission();
      
      if (!hasPermission) {
        hasPermission = await permissionService.requestLocationPermission();
        if (!hasPermission) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Permission de localisation refusée'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _currentPosition = position;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur GPS: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isLoadingGPS = false;
      });
    }
  }

  Future<void> _capturePhoto() async {
    try {
      final permissionService = Provider.of<PermissionService>(context, listen: false);
      
      // Check camera permission
      bool hasPermission = await permissionService.checkCameraPermission();
      
      if (!hasPermission) {
        hasPermission = await permissionService.requestCameraPermission();
        if (!hasPermission) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Permission de caméra refusée'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
      }

      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (photo != null) {
        setState(() {
          _capturedImage = File(photo.path);
        });
        
        // Automatically start analysis after photo capture
        _analyzeTree();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de la capture: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _analyzeTree() async {
    if (_capturedImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez d\'abord capturer une photo'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_treeTypeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner le type d\'arbre'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('GPS non disponible. Veuillez attendre...'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isAnalyzing = true;
    });

    try {
      final apiService = Provider.of<ApiService>(context, listen: false);
      
      // TODO: Call AI analysis service here
      // For now, simulate AI analysis
      await Future.delayed(const Duration(seconds: 2));
      
      // Mock AI results
      final mockDiseaseDetection = {
        'detected': true,
        'diseases': [
          {
            'name': 'Mildiou',
            'confidence': 87.5,
            'severity': 'medium',
            'affectedArea': 'Feuilles',
            'recommendations': [
              'Traiter avec un fongicide approprié',
              'Améliorer la circulation d\'air',
              'Éviter l\'arrosage des feuilles'
            ]
          }
        ],
        'overallHealthScore': 72
      };

      final mockTreeAnalysis = {
        'species': _treeTypeController.text,
        'estimatedAge': 8,
        'foliageDensity': 75,
        'structuralIntegrity': 85,
        'growthIndicators': {
          'newGrowth': true,
          'leafColor': 'Vert foncé',
          'branchHealth': 'Bonne'
        }
      };

      // Send to backend API
      final analysisData = {
        'treeType': _treeTypeController.text,
        'gpsData': {
          'latitude': _currentPosition!.latitude,
          'longitude': _currentPosition!.longitude,
          'accuracy': _currentPosition!.accuracy,
          'altitude': _currentPosition!.altitude,
        },
        'diseaseDetection': mockDiseaseDetection,
        'treeAnalysis': mockTreeAnalysis,
        'notes': _notesController.text,
        'images': [], // TODO: Upload image to server and get URL
      };

      final result = await apiService.createAnalysisWithGPS(analysisData);

      setState(() {
        _analysisResult = result;
      });

      if (mounted) {
        _showAnalysisResults(result);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de l\'analyse: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isAnalyzing = false;
      });
    }
  }

  void _showAnalysisResults(Map<String, dynamic> result) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: const BoxDecoration(
          color: Color(0xFF1A1A1A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[600],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00E676).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.analytics,
                      color: Color(0xFF00E676),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Résultats de l\'Analyse',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          result['isNewTree'] == true 
                            ? 'Nouvel arbre créé' 
                            : 'Arbre existant mis à jour',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            
            const Divider(color: Colors.grey, height: 1),
            
            // Results
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildResultSection(
                      'État de Santé',
                      Icons.favorite,
                      Colors.red,
                      result,
                    ),
                    const SizedBox(height: 20),
                    _buildDiseaseSection(result),
                    const SizedBox(height: 20),
                    _buildTreeInfoSection(result),
                  ],
                ),
              ),
            ),
            
            // Action buttons
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _resetForm();
                      },
                      icon: const Icon(Icons.add_a_photo),
                      label: const Text('Nouvelle Analyse'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E676),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultSection(
    String title, 
    IconData icon, 
    Color color, 
    Map<String, dynamic> result
  ) {
    final analysis = result['analysis'] as Map<String, dynamic>?;
    final healthScore = analysis?['diseaseDetection']?['overallHealthScore'] ?? 0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF262626),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 15),
          LinearProgressIndicator(
            value: healthScore / 100,
            backgroundColor: Colors.grey[800],
            valueColor: AlwaysStoppedAnimation<Color>(
              healthScore > 80 ? Colors.green : 
              healthScore > 60 ? Colors.orange : 
              Colors.red
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Score de santé: $healthScore%',
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiseaseSection(Map<String, dynamic> result) {
    final analysis = result['analysis'] as Map<String, dynamic>?;
    final diseases = analysis?['diseaseDetection']?['diseases'] as List? ?? [];
    
    if (diseases.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF262626),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: Colors.green.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 24),
            const SizedBox(width: 10),
            const Text(
              'Aucune maladie détectée',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Maladies Détectées',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 10),
        ...diseases.map((disease) => _buildDiseaseCard(disease)),
      ],
    );
  }

  Widget _buildDiseaseCard(Map<String, dynamic> disease) {
    final severity = disease['severity'] ?? 'low';
    Color severityColor = severity == 'critical' ? Colors.red :
                          severity == 'high' ? Colors.orange :
                          severity == 'medium' ? Colors.yellow :
                          Colors.blue;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF262626),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: severityColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  disease['name'] ?? 'Maladie inconnue',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: severityColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${disease['confidence']?.toStringAsFixed(1) ?? '0'}%',
                  style: TextStyle(
                    color: severityColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Sévérité: ${severity.toUpperCase()}',
            style: TextStyle(
              color: severityColor,
              fontSize: 14,
            ),
          ),
          if (disease['recommendations'] != null) ...[
            const SizedBox(height: 10),
            const Text(
              'Recommandations:',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 5),
            ...((disease['recommendations'] as List).map((rec) => 
              Padding(
                padding: const EdgeInsets.only(left: 10, top: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(color: Color(0xFF00E676))),
                    Expanded(
                      child: Text(
                        rec.toString(),
                        style: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildTreeInfoSection(Map<String, dynamic> result) {
    final tree = result['tree'] as Map<String, dynamic>?;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF262626),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: const Color(0xFF00E676).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informations de l\'Arbre',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 15),
          _buildInfoRow('ID', tree?['treeId'] ?? 'N/A'),
          _buildInfoRow('Type', tree?['treeType'] ?? 'N/A'),
          _buildInfoRow('Statut', tree?['status'] ?? 'N/A'),
          _buildInfoRow(
            'GPS', 
            '${tree?['location']?['latitude']?.toStringAsFixed(6) ?? 'N/A'}, '
            '${tree?['location']?['longitude']?.toStringAsFixed(6) ?? 'N/A'}'
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _resetForm() {
    setState(() {
      _capturedImage = null;
      _analysisResult = null;
      _notesController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Analyse d\'Arbre'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // GPS Status Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A1A),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                    color: _currentPosition != null 
                      ? const Color(0xFF00E676) 
                      : Colors.orange,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _currentPosition != null ? Icons.gps_fixed : Icons.gps_off,
                      color: _currentPosition != null 
                        ? const Color(0xFF00E676) 
                        : Colors.orange,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _currentPosition != null 
                              ? 'GPS Actif' 
                              : 'GPS Non Disponible',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (_currentPosition != null)
                            Text(
                              'Lat: ${_currentPosition!.latitude.toStringAsFixed(6)}, '
                              'Long: ${_currentPosition!.longitude.toStringAsFixed(6)}',
                              style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (_isLoadingGPS)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E676)),
                        ),
                      )
                    else if (_currentPosition == null)
                      IconButton(
                        icon: const Icon(Icons.refresh),
                        color: const Color(0xFF00E676),
                        onPressed: _getCurrentLocation,
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Tree Type Dropdown
              DropdownButtonFormField<String>(
                value: _treeTypeController.text.isEmpty ? null : _treeTypeController.text,
                decoration: InputDecoration(
                  labelText: 'Type d\'Arbre',
                  labelStyle: const TextStyle(color: Color(0xFF00E676)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: Color(0xFF00E676)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide(color: Colors.grey[700]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: Color(0xFF00E676)),
                  ),
                  filled: true,
                  fillColor: const Color(0xFF1A1A1A),
                ),
                dropdownColor: const Color(0xFF1A1A1A),
                style: const TextStyle(color: Colors.white),
                items: _treeTypes.map((type) => DropdownMenuItem(
                  value: type,
                  child: Text(type),
                )).toList(),
                onChanged: (value) {
                  setState(() {
                    _treeTypeController.text = value ?? '';
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez sélectionner un type d\'arbre';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // Camera Preview
              if (_capturedImage != null)
                Container(
                  height: 300,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: const Color(0xFF00E676)),
                    image: DecorationImage(
                      image: FileImage(_capturedImage!),
                      fit: BoxFit.cover,
                    ),
                  ),
                )
              else
                Container(
                  height: 300,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1A1A),
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: Colors.grey[700]!),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.camera_alt,
                          size: 80,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Aucune photo capturée',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              const SizedBox(height: 20),

              // Capture Button
              ElevatedButton.icon(
                onPressed: _capturePhoto,
                icon: const Icon(Icons.camera_alt),
                label: Text(_capturedImage == null ? 'Capturer Photo' : 'Recapturer'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00E676),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Notes Field
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Notes (optionnel)',
                  labelStyle: const TextStyle(color: Color(0xFF00E676)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide(color: Colors.grey[700]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: Color(0xFF00E676)),
                  ),
                  filled: true,
                  fillColor: const Color(0xFF1A1A1A),
                ),
              ),

              const SizedBox(height: 30),

              // Analyze Button
              if (_isAnalyzing)
                const Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E676)),
                      ),
                      SizedBox(height: 15),
                      Text(
                        'Analyse en cours...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                )
              else
                ElevatedButton.icon(
                  onPressed: _capturedImage != null ? _analyzeTree : null,
                  icon: const Icon(Icons.analytics),
                  label: const Text('Lancer l\'Analyse AI'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E676),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                    disabledBackgroundColor: Colors.grey[800],
                    disabledForegroundColor: Colors.grey[600],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _treeTypeController.dispose();
    _notesController.dispose();
    super.dispose();
  }
}
