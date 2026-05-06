import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';
import '../services/auth_service.dart';
import '../widgets/glassmorphism_widgets.dart';
import 'ar_measurement_screen.dart';

class TreeDetailsScreen extends StatefulWidget {
  final String treeId;

  const TreeDetailsScreen({Key? key, required this.treeId}) : super(key: key);

  @override
  _TreeDetailsScreenState createState() => _TreeDetailsScreenState();
}

class _TreeDetailsScreenState extends State<TreeDetailsScreen> {
  late Future<Map<String, dynamic>> _treeFuture;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTreeData();
  }

  Future<void> _loadTreeData() async {
    setState(() {
      _treeFuture = Provider.of<TreeService>(context, listen: false)
          .getTreeById(widget.treeId);
    });
  }

  double? _toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  int? _toInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value.toString());
  }

  String _formatMeters(dynamic value) {
    final numeric = _toDouble(value);
    if (numeric == null) return 'N/A';
    return '${numeric.toStringAsFixed(2)} m';
  }

  String _formatDate(dynamic value) {
    if (value == null) return 'N/A';
    DateTime? date;
    if (value is DateTime) {
      date = value;
    } else {
      date = DateTime.tryParse(value.toString());
    }
    if (date == null) return 'N/A';
    final local = date.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    return '$day/$month/${local.year}';
  }

  Future<void> _archiveTree() async {
    try {
      setState(() => _isLoading = true);
      final treeService = Provider.of<TreeService>(context, listen: false);
      await treeService.archiveTree(widget.treeId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Arbre archivé avec succès')),
        );
        Navigator.pop(context, true); // Return true to indicate refresh needed
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de l\'archivage: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _restoreTree() async {
    try {
      setState(() => _isLoading = true);
      final treeService = Provider.of<TreeService>(context, listen: false);
      await treeService.restoreTree(widget.treeId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Arbre restauré avec succès')),
        );
        Navigator.pop(context, true); // Return true to indicate refresh needed
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de la restauration: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showArchiveConfirmation() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Archiver l\'arbre'),
          content: const Text(
            'Êtes-vous sûr de vouloir archiver cet arbre ? Cette action est irréversible.'
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _archiveTree();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
              child: const Text('Archiver'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        title: Text('Arbre #${widget.treeId}'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _treeFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: Colors.green),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error, color: Colors.red[400], size: 64),
                  const SizedBox(height: 16),
                  Text(
                    'Erreur de chargement',
                    style: TextStyle(color: Colors.red[400], fontSize: 18),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    snapshot.error.toString(),
                    style: const TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadTreeData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Center(
              child: Text(
                'Aucune donnée disponible',
                style: TextStyle(color: Colors.white70),
              ),
            );
          }

          final treeData = snapshot.data!;
          final ownerInfo = treeData['ownerInfo'] ?? {};
          final isArchived = treeData['isArchived'] ?? false;
          final userEmail = Provider.of<AuthService>(context).email;
          final isAdmin = Provider.of<AuthService>(context).isAdmin;
          final canEdit = isAdmin || ownerInfo['email'] == userEmail;

          final measurements = treeData['measurements'] as Map<String, dynamic>? ?? {};
          final fruits = treeData['fruits'] as Map<String, dynamic>? ?? {};
          final location = treeData['location'] as Map<String, dynamic>? ?? {};
          final status = treeData['status']?.toString() ?? 'unknown';
          final statusColor = _getStatusColor(status);

          final heightText = _formatMeters(measurements['height']);
          final widthText = _formatMeters(measurements['width']);
          final shapeText = (measurements['approximateShape']?.toString().trim().isNotEmpty ?? false)
              ? measurements['approximateShape']?.toString()
              : 'Non specifiee';

          final hasFruits = fruits['present'] == true;
          final fruitCount = _toInt(fruits['estimatedQuantity']) ?? 0;
          final fruitCountText = hasFruits ? fruitCount.toString() : '0';
          final lastFruitAnalysis = _formatDate(fruits['lastAnalysisDate']);
          final lastUpdate = _formatDate(treeData['lastUpdate']);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isArchived)
                  Container(
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.archive, color: Colors.grey[600]),
                        const SizedBox(width: 8),
                        Text(
                          'Arbre archivé',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.forest, color: statusColor, size: 26),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              treeData['treeType']?.toString() ?? 'Type inconnu',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'ID: ${treeData['treeId']}',
                              style: TextStyle(color: Colors.white.withOpacity(0.7)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Derniere mise a jour: $lastUpdate',
                              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(color: statusColor, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Resume',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMiniStat('Hauteur', heightText, Icons.height),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildMiniStat('Largeur', widthText, Icons.width_normal),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildMiniStat('Fruits', fruitCountText, Icons.apple),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Informations du proprietaire',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: const Icon(Icons.person_outline, color: Colors.white70),
                        title: Text(
                          '${ownerInfo['firstName'] ?? ''} ${ownerInfo['lastName'] ?? ''}',
                          style: const TextStyle(color: Colors.white),
                        ),
                        subtitle: Text(ownerInfo['email'] ?? '', style: const TextStyle(color: Colors.white70)),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mesures et forme',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      ListTile(
                        leading: const Icon(Icons.height, color: Colors.white70),
                        title: const Text('Hauteur', style: TextStyle(color: Colors.white)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(heightText, style: const TextStyle(color: Colors.white)),
                            IconButton(
                              tooltip: 'Mesure AR',
                              icon: const Icon(Icons.straighten, color: Colors.white),
                              onPressed: () async {
                                final result = await Navigator.push<double?>(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ARMeasurementScreen(treeId: widget.treeId),
                                  ),
                                );
                                if (result != null && result > 0) {
                                  final previous = treeData['measurements']?['height'];
                                  setState(() {
                                    treeData['measurements'] ??= {};
                                    treeData['measurements']['height'] = result;
                                  });
                                  try {
                                    final treeService = Provider.of<TreeService>(context, listen: false);
                                    await treeService.updateTree(widget.treeId, {
                                      'measurements': {
                                        'height': result,
                                        'width': treeData['measurements']?['width'] ?? 0,
                                        'approximateShape': treeData['measurements']?['approximateShape'] ?? '',
                                      }
                                    });
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Hauteur mise a jour avec succes')),
                                      );
                                    }
                                  } catch (e) {
                                    setState(() {
                                      treeData['measurements']['height'] = previous;
                                    });
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Erreur mise a jour hauteur: $e')),
                                      );
                                    }
                                  }
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      ListTile(
                        leading: const Icon(Icons.width_normal, color: Colors.white70),
                        title: const Text('Largeur', style: TextStyle(color: Colors.white)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(widthText, style: const TextStyle(color: Colors.white)),
                            IconButton(
                              tooltip: 'Mesure AR',
                              icon: const Icon(Icons.straighten, color: Colors.white),
                              onPressed: () async {
                                final result = await Navigator.push<double?>(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ARMeasurementScreen(treeId: widget.treeId),
                                  ),
                                );
                                if (result != null && result > 0) {
                                  final previous = treeData['measurements']?['width'];
                                  setState(() {
                                    treeData['measurements'] ??= {};
                                    treeData['measurements']['width'] = result;
                                  });
                                  try {
                                    final treeService = Provider.of<TreeService>(context, listen: false);
                                    await treeService.updateTree(widget.treeId, {
                                      'measurements': {
                                        'height': treeData['measurements']?['height'] ?? 0,
                                        'width': result,
                                        'approximateShape': treeData['measurements']?['approximateShape'] ?? '',
                                      }
                                    });
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Largeur mise a jour avec succes')),
                                      );
                                    }
                                  } catch (e) {
                                    setState(() {
                                      treeData['measurements']['width'] = previous;
                                    });
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Erreur mise a jour largeur: $e')),
                                      );
                                    }
                                  }
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      _buildInfoRow('Forme approximative', shapeText),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Fruits',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      _buildInfoRow('Presence', hasFruits ? 'Oui' : 'Non'),
                      _buildInfoRow('Quantite estimee', fruitCountText),
                      _buildInfoRow('Derniere analyse', lastFruitAnalysis),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Localisation',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      _buildInfoRow('Latitude', _toDouble(location['latitude'])?.toStringAsFixed(6) ?? 'N/A'),
                      _buildInfoRow('Longitude', _toDouble(location['longitude'])?.toStringAsFixed(6) ?? 'N/A'),
                    ],
                  ),
                ),

                if (treeData['images'] != null && (treeData['images'] as List).isNotEmpty) ...[
                  const SizedBox(height: 16),
                  GlassmorphismContainer(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Photos',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 120,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: (treeData['images'] as List).length,
                            itemBuilder: (context, idx) {
                              final url = (treeData['images'][idx] ?? '').toString();
                              return Padding(
                                padding: const EdgeInsets.only(right: 8.0),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    url,
                                    width: 120,
                                    height: 120,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      width: 120,
                                      height: 120,
                                      color: Colors.grey[800],
                                      child: const Icon(Icons.broken_image, color: Colors.white54),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                if (canEdit && !isArchived) ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        onPressed: _showArchiveConfirmation,
                        icon: const Icon(Icons.archive),
                        label: const Text('Archiver'),
                        style: TextButton.styleFrom(
                          foregroundColor: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                  ),
                ],
                if (canEdit && isArchived) ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _restoreTree,
                        icon: const Icon(Icons.unarchive),
                        label: const Text('Restaurer'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
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
              color: Colors.white.withOpacity(0.6),
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

  Widget _buildMiniStat(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: Colors.white.withOpacity(0.8)),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return Colors.green;
      case 'warning':
        return Colors.orange;
      case 'critical':
        return Colors.red;
      case 'archived':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }
}