import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';
import '../services/auth_service.dart';
import '../widgets/glassmorphism_widgets.dart';

class AdminTreeManagement extends StatefulWidget {
  const AdminTreeManagement({Key? key}) : super(key: key);

  @override
  _AdminTreeManagementState createState() => _AdminTreeManagementState();
}

class _AdminTreeManagementState extends State<AdminTreeManagement> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _trees = [];
  String _searchQuery = '';
  String _statusFilter = 'all';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTrees();
  }

  Future<void> _loadTrees() async {
    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      final trees = await treeService.getAllTrees();
      setState(() {
        _trees = List<Map<String, dynamic>>.from(trees);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _filteredTrees {
    return _trees.where((tree) {
      final matchesSearch = 
        tree['treeType'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
        tree['treeId'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      
      final matchesStatus = _statusFilter == 'all' || tree['status'] == _statusFilter;
      
      return matchesSearch && matchesStatus;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ModernBackground(
        child: Column(
          children: [
            // En-tête avec statistiques
            GlassmorphismContainer(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const NeonText(
                    text: 'Gestion des Arbres',
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _buildStatCard(
                        'Total',
                        _trees.length.toString(),
                        Icons.forest,
                      ),
                      _buildStatCard(
                        'En bonne santé',
                        _trees.where((t) => t['status'] == 'healthy').length.toString(),
                        Icons.check_circle,
                        color: const Color(0xFF00E676),
                      ),
                      _buildStatCard(
                        'À surveiller',
                        _trees.where((t) => t['status'] == 'warning').length.toString(),
                        Icons.warning,
                        color: Colors.orange,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Barre de recherche et filtres
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  GlassmorphismContainer(
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Rechercher un arbre...',
                        hintStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
                        prefixIcon: Icon(Icons.search, color: Colors.white.withOpacity(0.7)),
                        border: InputBorder.none,
                      ),
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('Tous', 'all'),
                        const SizedBox(width: 8),
                        _buildFilterChip('En bonne santé', 'healthy'),
                        const SizedBox(width: 8),
                        _buildFilterChip('À surveiller', 'warning'),
                        const SizedBox(width: 8),
                        _buildFilterChip('Critique', 'critical'),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Liste des arbres
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF00E676),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadTrees,
                      color: const Color(0xFF00E676),
                      child: _buildTreeList(),
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.pushNamed(context, '/admin/add-tree');
          if (result == true) {
            _loadTrees();
          }
        },
        backgroundColor: const Color(0xFF00E676),
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add),
        label: const Text('Ajouter un arbre'),
      ),
    );
  }

  Widget _buildTreeList() {
    if (_filteredTrees.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.forest,
              size: 64,
              color: Colors.white.withOpacity(0.4),
            ),
            const SizedBox(height: 16),
            Text(
              'Aucun arbre trouvé',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: _filteredTrees.length,
      itemBuilder: (context, index) {
        final tree = _filteredTrees[index];
        return _buildTreeCard(tree);
      },
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, {Color? color}) {
    return Expanded(
      child: GlassmorphismContainer(
        child: Column(
          children: [
            Icon(icon, color: color ?? Colors.white.withOpacity(0.7), size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color ?? Colors.white,
              ),
            ),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _statusFilter = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected 
              ? const Color(0xFF00E676).withOpacity(0.2)
              : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected 
                ? const Color(0xFF00E676)
                : Colors.white.withOpacity(0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected 
                ? const Color(0xFF00E676)
                : Colors.white.withOpacity(0.8),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildTreeCard(Map<String, dynamic> tree) {
    final status = tree['status'] ?? 'unknown';
    final statusColor = status == 'healthy'
        ? const Color(0xFF00E676)
        : status == 'warning'
            ? Colors.orange
            : Colors.red;

    final measurements = tree['measurements'] as Map<String, dynamic>? ?? {};
    final height = measurements['height']?.toString() ?? '0';
    final width = measurements['width']?.toString() ?? '0';
    
    final fruits = tree['fruits'] as Map<String, dynamic>? ?? {};
    final hasFruits = fruits['present'] ?? false;
    final fruitCount = fruits['estimatedQuantity']?.toString() ?? '0';

    final ownerInfo = tree['ownerInfo'] as Map<String, dynamic>? ?? {};

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: GlassmorphismContainer(
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            iconColor: Colors.white,
            collapsedIconColor: Colors.white.withOpacity(0.7),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    status == 'healthy'
                        ? Icons.check_circle
                        : status == 'warning'
                            ? Icons.warning
                            : Icons.error,
                    color: statusColor,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tree['treeType']?.toString() ?? 'Type inconnu',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'ID: ${tree['treeId']}',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Owner Information
                    GlassmorphismContainer(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Propriétaire',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(Icons.person_outline, 
                                size: 20, 
                                color: Colors.white.withOpacity(0.7)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${ownerInfo['firstName'] ?? ''} ${ownerInfo['lastName'] ?? ''}'.trim(),
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      ownerInfo['email'] ?? 'Email non spécifié',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.white.withOpacity(0.6),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Tree Details
                    Row(
                      children: [
                        Expanded(
                          child: _buildDetailCard(
                            'Hauteur',
                            '$height m',
                            Icons.height,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildDetailCard(
                            'Largeur',
                            '$width m',
                            Icons.width_normal,
                          ),
                        ),
                        if (hasFruits) ...[
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildDetailCard(
                              'Fruits',
                              fruitCount,
                              Icons.apple,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Action Buttons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              '/tree-details',
                              arguments: tree['treeId'],
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(color: Colors.white.withOpacity(0.3)),
                          ),
                          icon: const Icon(Icons.visibility),
                          label: const Text('Voir'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              '/admin/edit-tree',
                              arguments: {
                                'treeId': tree['treeId'],
                                'tree': tree,
                              },
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00E676),
                            foregroundColor: Colors.black,
                          ),
                          icon: const Icon(Icons.edit),
                          label: const Text('Modifier'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailCard(String label, String value, IconData icon) {
    return GlassmorphismContainer(
      child: Column(
        children: [
          Icon(icon, size: 20, color: Colors.white.withOpacity(0.7)),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withOpacity(0.6),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}