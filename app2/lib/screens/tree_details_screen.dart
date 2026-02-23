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

          return SingleChildScrollView(
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Informations du propriétaire',
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
                        'Détails de l\'arbre',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: const Icon(Icons.height, color: Colors.white70),
                        title: const Text('Hauteur', style: TextStyle(color: Colors.white)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('${treeData['measurements']?['height'] ?? 0} m', style: const TextStyle(color: Colors.white)),
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
                                  setState(() {
                                    treeData['measurements'] ??= {};
                                    treeData['measurements']['height'] = result;
                                  });
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
                            Text('${treeData['measurements']?['width'] ?? 0} m', style: const TextStyle(color: Colors.white)),
                            IconButton(
                              tooltip: 'Mesure AR',
                              icon: const Icon(Icons.straighten, color: Colors.white),
                              onPressed: () async {
                                // reuse AR screen to compute width if needed
                                final result = await Navigator.push<double?>(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ARMeasurementScreen(treeId: widget.treeId),
                                  ),
                                );
                                if (result != null && result > 0) {
                                  setState(() {
                                    treeData['measurements'] ??= {};
                                    treeData['measurements']['width'] = result;
                                  });
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      ListTile(
                        leading: const Icon(Icons.monitor_heart_outlined, color: Colors.white70),
                        title: const Text('État', style: TextStyle(color: Colors.white)),
                        trailing: Chip(
                          label: Text(treeData['status'] ?? 'unknown'),
                          backgroundColor: _getStatusColor(treeData['status']),
                        ),
                      ),
                      if (treeData['images'] != null && (treeData['images'] as List).isNotEmpty) ...[
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
                    ],
                  ),
                ),

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