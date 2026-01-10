import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';

class EditTreeScreen extends StatefulWidget {
  final String treeId;

  const EditTreeScreen({Key? key, required this.treeId}) : super(key: key);

  @override
  _EditTreeScreenState createState() => _EditTreeScreenState();
}

class _EditTreeScreenState extends State<EditTreeScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  final Map<String, dynamic> _treeData = {
    'treeType': '',
    'status': 'healthy',
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

  @override
  void initState() {
    super.initState();
    _loadTreeData();
  }

  Future<void> _loadTreeData() async {
    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      final tree = await treeService.getTreeById(widget.treeId);
      
      setState(() {
        _treeData['treeType'] = tree['treeType'] ?? '';
        _treeData['status'] = tree['status'] ?? 'healthy';
        _treeData['measurements'] = {
          'height': double.tryParse(tree['measurements']['height'].toString()) ?? 0.0,
          'width': double.tryParse(tree['measurements']['width'].toString()) ?? 0.0,
          'approximateShape': tree['measurements']['approximateShape'] ?? '',
        };
        _treeData['fruits'] = {
          'present': tree['fruits']['present'] ?? false,
          'estimatedQuantity': tree['fruits']['estimatedQuantity'] ?? 0,
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Erreur lors du chargement des données: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveTree() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      await treeService.updateTree(widget.treeId, _treeData);
      
      if (!mounted) return;
      
      Navigator.of(context).pop(true); // Return true to indicate success
    } catch (e) {
      setState(() {
        _error = 'Erreur lors de la sauvegarde: $e';
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Modifier l\'arbre')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Modifier l\'arbre #${widget.treeId}'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveTree,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Text(
                    'Enregistrer',
                    style: TextStyle(color: Colors.white),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: Card(
                    color: Colors.red.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Text(
                        _error!,
                        style: TextStyle(color: Colors.red.shade900),
                      ),
                    ),
                  ),
                ),

              // Type d'arbre
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Type d\'arbre',
                  border: OutlineInputBorder(),
                ),
                initialValue: _treeData['treeType'],
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

              // État
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'État',
                  border: OutlineInputBorder(),
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
              const SizedBox(height: 16),

              // Mesures
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Mesures',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              decoration: const InputDecoration(
                                labelText: 'Hauteur (m)',
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              initialValue: _treeData['measurements']['height'].toString(),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'La hauteur est requise';
                                }
                                final height = double.tryParse(value);
                                if (height == null) {
                                  return 'Hauteur invalide';
                                }
                                if (height < 0) {
                                  return 'La hauteur doit être positive';
                                }
                                return null;
                              },
                              onSaved: (value) {
                                _treeData['measurements']['height'] = double.tryParse(value!) ?? 0.0;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              decoration: const InputDecoration(
                                labelText: 'Largeur (m)',
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              initialValue: _treeData['measurements']['width'].toString(),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'La largeur est requise';
                                }
                                final width = double.tryParse(value);
                                if (width == null) {
                                  return 'Largeur invalide';
                                }
                                if (width < 0) {
                                  return 'La largeur doit être positive';
                                }
                                return null;
                              },
                              onSaved: (value) {
                                _treeData['measurements']['width'] = double.tryParse(value!) ?? 0.0;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        decoration: const InputDecoration(
                          labelText: 'Forme approximative',
                          border: OutlineInputBorder(),
                        ),
                        initialValue: _treeData['measurements']['approximateShape'],
                        onSaved: (value) {
                          _treeData['measurements']['approximateShape'] = value ?? '';
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Fruits
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Fruits',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        title: const Text('Présence de fruits'),
                        value: _treeData['fruits']['present'],
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
                          decoration: const InputDecoration(
                            labelText: 'Quantité estimée',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          initialValue: _treeData['fruits']['estimatedQuantity'].toString(),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'La quantité est requise';
                            }
                            final quantity = int.tryParse(value);
                            if (quantity == null) {
                              return 'Quantité invalide';
                            }
                            if (quantity < 0) {
                              return 'La quantité doit être positive';
                            }
                            return null;
                          },
                          onSaved: (value) {
                            _treeData['fruits']['estimatedQuantity'] = int.tryParse(value!) ?? 0;
                          },
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}