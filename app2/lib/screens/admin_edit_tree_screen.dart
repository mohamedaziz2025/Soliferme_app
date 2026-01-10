import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';
import '../widgets/glassmorphism_widgets.dart';

class AdminEditTreeScreen extends StatefulWidget {
  final String treeId;
  final Map<String, dynamic> initialData;

  const AdminEditTreeScreen({
    Key? key,
    required this.treeId,
    required this.initialData,
  }) : super(key: key);

  @override
  _AdminEditTreeScreenState createState() => _AdminEditTreeScreenState();
}

class _AdminEditTreeScreenState extends State<AdminEditTreeScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;
  late Map<String, dynamic> _treeData;

  @override
  void initState() {
    super.initState();
    // Create a deep copy of initialData with default values for nested objects
    _treeData = {
      'treeId': widget.treeId,
      'measurements': {
        'height': widget.initialData['measurements']?['height'] ?? 0.0,
        'width': widget.initialData['measurements']?['width'] ?? 0.0,
        'approximateShape': widget.initialData['measurements']?['approximateShape'] ?? '',
      },
      'location': {
        'latitude': widget.initialData['location']?['latitude'] ?? 0.0,
        'longitude': widget.initialData['location']?['longitude'] ?? 0.0,
      },
      'fruits': {
        'present': widget.initialData['fruits']?['present'] ?? false,
        'estimatedQuantity': widget.initialData['fruits']?['estimatedQuantity'] ?? 0,
      },
      'status': widget.initialData['status'] ?? 'healthy',
      'treeType': widget.initialData['treeType'] ?? '',
      'ownerInfo': {
        'email': widget.initialData['ownerInfo']?['email'] ?? '',
        'firstName': widget.initialData['ownerInfo']?['firstName'] ?? '',
        'lastName': widget.initialData['ownerInfo']?['lastName'] ?? '',
      },
    };
  }

  Future<void> _updateTree() async {
    if (!_formKey.currentState!.validate()) return;
    
    _formKey.currentState!.save();

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      await treeService.updateTree(widget.treeId, _treeData);
      
      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Arbre mis à jour avec succès')),
      );
      Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        _errorMessage = 'Erreur lors de la mise à jour: $e';
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
        title: const Text('Modifier l\'arbre'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_errorMessage != null)
                Card(
                  color: Colors.red.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red.shade900),
                    ),
                  ),
                ),

              // Owner Information Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Informations du propriétaire',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _treeData['ownerInfo']['firstName'],
                        decoration: const InputDecoration(
                          labelText: 'Prénom',
                          border: OutlineInputBorder(),
                        ),
                        onSaved: (value) {
                          _treeData['ownerInfo']['firstName'] = value ?? '';
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _treeData['ownerInfo']['lastName'],
                        decoration: const InputDecoration(
                          labelText: 'Nom',
                          border: OutlineInputBorder(),
                        ),
                        onSaved: (value) {
                          _treeData['ownerInfo']['lastName'] = value ?? '';
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _treeData['ownerInfo']['email'],
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        onSaved: (value) {
                          _treeData['ownerInfo']['email'] = value ?? '';
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Informations de base',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: widget.treeId,
                        decoration: const InputDecoration(
                          labelText: 'ID de l\'arbre',
                          hintText: 'Ex: 12345 (3-9 chiffres)',
                        ),
                        keyboardType: TextInputType.number,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'L\'ID de l\'arbre est requis';
                          }
                          if (!RegExp(r'^\d{3,9}$').hasMatch(value)) {
                            return 'L\'ID doit être un nombre de 3 à 9 chiffres';
                          }
                          return null;
                        },
                        onSaved: (value) {
                          _treeData['treeId'] = value;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _treeData['treeType'],
                        decoration: const InputDecoration(
                          labelText: 'Type d\'arbre',
                          hintText: 'Ex: Pommier, Poirier...',
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
                        decoration: const InputDecoration(
                          labelText: 'État',
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
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mesures',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: _treeData['measurements']['height'].toString(),
                              decoration: const InputDecoration(
                                labelText: 'Hauteur (m)',
                                suffixText: 'm',
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
                              initialValue: _treeData['measurements']['width'].toString(),
                              decoration: const InputDecoration(
                                labelText: 'Largeur (m)',
                                suffixText: 'm',
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
                        initialValue: _treeData['measurements']['approximateShape'],
                        decoration: const InputDecoration(
                          labelText: 'Forme approximative',
                          hintText: 'Ex: Conique, Sphérique...',
                        ),
                        onSaved: (value) {
                          _treeData['measurements']['approximateShape'] = value ?? '';
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Localisation GPS',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: _treeData['location']['latitude']?.toString() ?? '',
                              decoration: const InputDecoration(
                                labelText: 'Latitude',
                                hintText: 'Ex: 36.8065',
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'La latitude est requise';
                                }
                                final lat = double.tryParse(value);
                                if (lat == null) {
                                  return 'Valeur invalide';
                                }
                                if (lat < -90 || lat > 90) {
                                  return 'Latitude doit être entre -90 et 90';
                                }
                                return null;
                              },
                              onSaved: (value) {
                                _treeData['location']['latitude'] = double.parse(value!);
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              initialValue: _treeData['location']['longitude']?.toString() ?? '',
                              decoration: const InputDecoration(
                                labelText: 'Longitude',
                                hintText: 'Ex: 10.1815',
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'La longitude est requise';
                                }
                                final lon = double.tryParse(value);
                                if (lon == null) {
                                  return 'Valeur invalide';
                                }
                                if (lon < -180 || lon > 180) {
                                  return 'Longitude doit être entre -180 et 180';
                                }
                                return null;
                              },
                              onSaved: (value) {
                                _treeData['location']['longitude'] = double.parse(value!);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Coordonnées GPS exactes de l\'arbre',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Fruits',
                        style: Theme.of(context).textTheme.titleLarge,
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
                          initialValue: _treeData['fruits']['estimatedQuantity'].toString(),
                          decoration: const InputDecoration(
                            labelText: 'Quantité estimée',
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
              ),
              const SizedBox(height: 24),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.cancel),
                      label: const Text('Annuler'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isLoading ? null : _updateTree,
                      icon: _isLoading 
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Icon(Icons.save),
                      label: Text(_isLoading ? 'Mise à jour...' : 'Mettre à jour'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}