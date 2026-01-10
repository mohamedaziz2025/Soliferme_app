import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';
import '../widgets/glassmorphism_widgets.dart';

class AdminAddTreeScreen extends StatefulWidget {
  const AdminAddTreeScreen({Key? key}) : super(key: key);

  @override
  _AdminAddTreeScreenState createState() => _AdminAddTreeScreenState();
}

class _AdminAddTreeScreenState extends State<AdminAddTreeScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  final Map<String, dynamic> _treeData = {
    'treeType': '',
    'status': 'healthy',
    'location': {
      'latitude': 0.0,
      'longitude': 0.0,
    },
    'measurements': {
      'height': 0.0,
      'width': 0.0,
      'approximateShape': '',
    },
    'fruits': {
      'present': false,
      'estimatedQuantity': 0,
    },
  };

  Future<void> _saveTree() async {
    if (!_formKey.currentState!.validate()) return;
    
    _formKey.currentState!.save();

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      await treeService.addTree(_treeData);
      
      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Arbre ajouté avec succès')),
      );
      Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        _errorMessage = 'Erreur lors de l\'ajout: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ajouter un arbre'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: ModernBackground(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null)
                  GlassmorphismContainer(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          Icon(Icons.error, color: Colors.red.shade400),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(color: Colors.red.shade300),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                GlassmorphismContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const NeonText(
                        text: 'Informations de base',
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Type d\'arbre',
                          labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                          hintText: 'Ex: Pommier, Poirier...',
                          hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Color(0xFF00E676)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Le type d\'arbre est requis';
                          }
                          return null;
                        },
                        onSaved: (value) {
                          _treeData['treeType'] = value;
                        },
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        style: const TextStyle(color: Colors.white),
                        dropdownColor: const Color(0xFF1A1A2E),
                        decoration: InputDecoration(
                          labelText: 'État',
                          labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Color(0xFF00E676)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        value: _treeData['status'],
                        items: const [
                          DropdownMenuItem(value: 'healthy', child: Text('En bonne santé')),
                          DropdownMenuItem(value: 'warning', child: Text('À surveiller')),
                          DropdownMenuItem(value: 'critical', child: Text('Critique')),
                        ],
                        onChanged: (value) {
                          setState(() {
                            _treeData['status'] = value;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                GlassmorphismContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const NeonText(
                        text: 'Mesures',
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                labelText: 'Hauteur (m)',
                                labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                                suffixText: 'm',
                                suffixStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                                enabledBorder: OutlineInputBorder(
                                  borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderSide: const BorderSide(color: Color(0xFF00E676)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'La hauteur est requise';
                                }
                                if (double.tryParse(value) == null) {
                                  return 'Valeur invalide';
                                }
                                return null;
                              },
                              onSaved: (value) {
                                _treeData['measurements']['height'] = double.parse(value!);
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                labelText: 'Largeur (m)',
                                labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                                suffixText: 'm',
                                suffixStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                                enabledBorder: OutlineInputBorder(
                                  borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderSide: const BorderSide(color: Color(0xFF00E676)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'La largeur est requise';
                                }
                                if (double.tryParse(value) == null) {
                                  return 'Valeur invalide';
                                }
                                return null;
                              },
                              onSaved: (value) {
                                _treeData['measurements']['width'] = double.parse(value!);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Forme approximative',
                          labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                          hintText: 'Ex: Conique, Sphérique...',
                          hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Color(0xFF00E676)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onSaved: (value) {
                          _treeData['measurements']['approximateShape'] = value ?? '';
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                GlassmorphismContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const NeonText(
                        text: 'Fruits',
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        title: const Text(
                          'Présence de fruits',
                          style: TextStyle(color: Colors.white),
                        ),
                        value: _treeData['fruits']['present'],
                        activeColor: const Color(0xFF00E676),
                        onChanged: (bool value) {
                          setState(() {
                            _treeData['fruits']['present'] = value;
                            if (!value) {
                              _treeData['fruits']['estimatedQuantity'] = 0;
                            }
                          });
                        },
                      ),
                      if (_treeData['fruits']['present'])
                        TextFormField(
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: 'Quantité estimée',
                            labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                            enabledBorder: OutlineInputBorder(
                              borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderSide: const BorderSide(color: Color(0xFF00E676)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          keyboardType: TextInputType.number,
                          validator: (value) {
                            if (!_treeData['fruits']['present']) return null;
                            if (value == null || value.isEmpty) {
                              return 'La quantité est requise';
                            }
                            if (int.tryParse(value) == null) {
                              return 'Valeur invalide';
                            }
                            return null;
                          },
                          onSaved: (value) {
                            _treeData['fruits']['estimatedQuantity'] = 
                                int.tryParse(value ?? '0') ?? 0;
                          },
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _saveTree,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E676),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: _isLoading 
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                            ),
                          )
                        : const Icon(Icons.save),
                    label: Text(
                      _isLoading ? 'Enregistrement...' : 'Enregistrer',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}