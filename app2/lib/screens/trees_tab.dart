import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';
import '../services/auth_service.dart';
import '../widgets/glassmorphism_widgets.dart';

class TreesTab extends StatefulWidget {
  const TreesTab({Key? key}) : super(key: key);

  @override
  _TreesTabState createState() => _TreesTabState();
}

class _TreesTabState extends State<TreesTab> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _trees = [];
  Map<String, dynamic>? _treeStats;
  String _searchQuery = '';
  String _statusFilter = 'all';
  bool _showArchived = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTrees();
  }

  Future<void> _loadTrees() async {
    try {
      final userEmail = Provider.of<AuthService>(context, listen: false).email;
      final isAdmin = Provider.of<AuthService>(context, listen: false).isAdmin;

      final treeService = Provider.of<TreeService>(context, listen: false);

      Map<String, dynamic> response;
      if (isAdmin) {
        response = await treeService.getTreeStats();
        final treesResponse = await treeService.getAllTrees();
        setState(() {
          _trees = List<Map<String, dynamic>>.from(treesResponse);
          _treeStats = response;
          _isLoading = false;
        });
      } else if (userEmail != null) {
        response = await treeService.getTreesByOwnerEmail(userEmail);
        setState(() {
          _trees = List<Map<String, dynamic>>.from(response['trees'] ?? []);
          _treeStats = response['stats'];
          _isLoading = false;
        });
      }
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
      // Apply search filter
      final matchesSearch = tree['treeType'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
                          tree['treeId'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
                          tree['ownerInfo']['email'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      
      // Apply status filter
      final matchesStatus = _statusFilter == 'all' || tree['status'] == _statusFilter;
      
      // Apply archive filter
      final matchesArchive = _showArchived ? true : !(tree['isArchived'] ?? false);

      return matchesSearch && matchesStatus && matchesArchive;
    }).toList();
  }



  Widget _buildStatsCard(String title, String value, Color primaryColor, String emoji) {
    return HolographicCard(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              emoji,
              style: const TextStyle(fontSize: 28),
            ),
            const SizedBox(height: 12),
            NeonText(
              text: value,
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: primaryColor,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = Provider.of<AuthService>(context).isAdmin;

    return ModernBackground(
      child: Column(
        children: [
          if (_treeStats != null) ...[
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  NeonText(
                    text: '🌳 Statistiques des Arbres',
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  const SizedBox(height: 20),
                  GridView.count(
                    shrinkWrap: true,
                    crossAxisCount: 2,
                    childAspectRatio: 1.2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    children: [
                      _buildStatsCard(
                        'Total des arbres',
                        _treeStats!['total'].toString(),
                        const Color(0xFF00E676),
                        '🌳',
                      ),
                      _buildStatsCard(
                        'En bonne santé',
                        _treeStats!['healthy'].toString(),
                        const Color(0xFF66BB6A),
                        '💚',
                      ),
                      _buildStatsCard(
                        'À surveiller',
                        _treeStats!['warning'].toString(),
                        const Color(0xFF81C784),
                        '⚠️',
                      ),
                      _buildStatsCard(
                        'Critique',
                        _treeStats!['critical'].toString(),
                        const Color(0xFFA5D6A7),
                        '🚨',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],

          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                GlassmorphismContainer(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: '🔍 Rechercher un arbre...',
                      hintStyle: TextStyle(color: Colors.white60),
                      prefixIcon: Icon(Icons.search, color: const Color(0xFF00E676)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: const Color(0xFF00E676), width: 2),
                      ),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.1),
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
                      _buildModernFilterChip('🌍 Tous', 'all'),
                      const SizedBox(width: 8),
                      _buildModernFilterChip('💚 Bonne santé', 'healthy'),
                      const SizedBox(width: 8),
                      _buildModernFilterChip('⚠️ À surveiller', 'warning'),
                      const SizedBox(width: 8),
                      _buildModernFilterChip('🚨 Critique', 'critical'),
                      if (isAdmin) ...[
                        const SizedBox(width: 8),
                        _buildModernArchiveChip(),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? Center(
                    child: GlassmorphismContainer(
                      child: const CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E676)),
                      ),
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
    );
  }

  Widget _buildModernFilterChip(String label, String value) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _statusFilter = isSelected ? 'all' : value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00E676).withOpacity(0.3)
              : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF00E676) : Colors.white.withOpacity(0.3),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF00E676) : Colors.white70,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildModernArchiveChip() {
    return GestureDetector(
      onTap: () {
        setState(() {
          _showArchived = !_showArchived;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: _showArchived
              ? const Color(0xFF81C784).withOpacity(0.3)
              : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: _showArchived ? const Color(0xFF81C784) : Colors.white.withOpacity(0.3),
            width: _showArchived ? 2 : 1,
          ),
        ),
        child: Text(
          '📦 Archivés',
          style: TextStyle(
            color: _showArchived ? const Color(0xFF81C784) : Colors.white70,
            fontWeight: _showArchived ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildTreeList() {
    final filteredTrees = _filteredTrees;
    
    if (filteredTrees.isEmpty) {
      return Center(
        child: GlassmorphismContainer(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF81C784).withOpacity(0.3),
                ),
                child: Icon(
                  Icons.forest,
                  size: 40,
                  color: Colors.white60,
                ),
              ),
              const SizedBox(height: 20),
              NeonText(
                text: 'Aucun arbre trouvé',
                fontSize: 18,
                color: Colors.white70,
              ),
              const SizedBox(height: 8),
              Text(
                'Essayez de modifier vos filtres',
                style: TextStyle(
                  color: Colors.white60,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: filteredTrees.length,
      itemBuilder: (context, index) {
        final tree = filteredTrees[index];
        final isArchived = tree['isArchived'] ?? false;
        final statusColor = _getStatusColor(tree['status']);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: HolographicCard(
            onTap: () {
              Navigator.pushNamed(
                context,
                '/tree-details',
                arguments: tree['treeId'],
              ).then((refreshNeeded) {
                if (refreshNeeded == true) {
                  _loadTrees();
                }
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusColor,
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withOpacity(0.3),
                          blurRadius: 15,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        tree['treeId'].toString().substring(0, 1),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            NeonText(
                              text: 'Arbre #${tree['treeId']}',
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                            const Spacer(),                              if (isArchived)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF81C784).withOpacity(0.3),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '📦 Archivé',
                                  style: TextStyle(
                                    color: const Color(0xFF81C784),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '🌳 ${tree['treeType'] ?? 'Type inconnu'}',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '👤 ${tree['ownerInfo']['firstName']} ${tree['ownerInfo']['lastName']}',
                          style: TextStyle(
                            color: Colors.white60,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: statusColor.withOpacity(0.5),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: statusColor,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    _getStatusText(tree['status']),
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
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
                  Icon(
                    Icons.chevron_right,
                    color: Colors.white60,
                    size: 24,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _getStatusText(String? status) {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'Bonne santé';
      case 'warning':
        return 'À surveiller';
      case 'critical':
        return 'Critique';
      case 'archived':
        return 'Archivé';
      default:
        return 'Inconnu';
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return const Color(0xFF00E676);
      case 'warning':
        return const Color(0xFF66BB6A);
      case 'critical':
        return const Color(0xFF81C784);
      case 'archived':
        return const Color(0xFFA5D6A7);
      default:
        return const Color(0xFFA5D6A7);
    }
  }
}