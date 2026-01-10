import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/tree_service.dart';

class AddTreeForm extends StatefulWidget {
  final Function? onTreeAdded;

  const AddTreeForm({Key? key, this.onTreeAdded}) : super(key: key);

  @override
  _AddTreeFormState createState() => _AddTreeFormState();
}

class _AddTreeFormState extends State<AddTreeForm> {
  final _formKey = GlobalKey<FormState>();
  final TreeService _treeService = TreeService();
  bool _isLoading = false;
  
  final Map<String, dynamic> _treeData = {
    'treeId': '',
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

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    
    if (!authService.isAdmin) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.all(16.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ajouter un nouvel arbre',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'ID de l\'arbre',
                  hintText: 'Ex: 12345 (3-9 chiffres)',
                  border: OutlineInputBorder(),
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
                decoration: const InputDecoration(
                  labelText: 'Type d\'arbre',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Ce champ est requis';
                  }
                  return null;
                },
                onSaved: (value) {
                  _treeData['treeType'] = value;
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'Latitude',
                        hintText: 'Ex: 36.8065',
                        border: OutlineInputBorder(),
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
                      decoration: const InputDecoration(
                        labelText: 'Longitude',
                        hintText: 'Ex: 10.1815',
                        border: OutlineInputBorder(),
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
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'Hauteur (m)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Ce champ est requis';
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
                      decoration: const InputDecoration(
                        labelText: 'Largeur (m)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Ce champ est requis';
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
                decoration: const InputDecoration(
                  labelText: 'Forme approximative',
                  border: OutlineInputBorder(),
                ),
                onSaved: (value) {
                  _treeData['measurements']['approximateShape'] = value ?? '';
                },
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text('Présence de fruits'),
                value: _treeData['fruits']['present'] as bool,
                onChanged: (bool value) {
                  setState(() {
                    _treeData['fruits']['present'] = value;
                  });
                },
              ),
              if (_treeData['fruits']['present'])
                TextFormField(
                  decoration: const InputDecoration(
                    labelText: 'Quantité estimée de fruits',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                  onSaved: (value) {
                    _treeData['fruits']['estimatedQuantity'] = int.parse(value ?? '0');
                  },
                ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitForm,
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Ajouter l\'arbre'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      _formKey.currentState!.save();
      final newTree = await _treeService.createTree(_treeData);
      
      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Arbre ajouté avec succès')),
      );

      if (widget.onTreeAdded != null) {
        widget.onTreeAdded!();
      }

      _formKey.currentState!.reset();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}