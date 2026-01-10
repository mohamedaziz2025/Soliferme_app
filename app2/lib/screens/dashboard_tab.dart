import 'package:flutter/material.dart';
import '../widgets/glassmorphism_widgets.dart';
import '../services/api_service.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({Key? key}) : super(key: key);

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    try {
      final stats = await _apiService.getDashboardStats();

      // Normalize backend response shape to the keys expected by the UI.
      // Backend returns { trees: { total, healthy, warning, critical, archived, ... }, users: {...}, recentActivities: [...] }
      final Map<String, dynamic> normalized = {};

      if (stats.containsKey('trees')) {
        final trees = Map<String, dynamic>.from(stats['trees'] ?? {});
        final total = (trees['total'] ?? 0) as int;
        final healthy = (trees['healthy'] ?? 0) as int;
        final warning = (trees['warning'] ?? 0) as int;
        final critical = (trees['critical'] ?? 0) as int;

        normalized['totalTrees'] = total;
        // backend may not provide 'withFruits' -> default to 0
        normalized['treesWithFruits'] = trees['withFruits'] ?? 0;
        normalized['healthyTrees'] = healthy;
        // Consider both warning and critical as 'needs attention'
        normalized['needsAttention'] = warning + critical;

        // Monthly growth: try to use provided value, otherwise empty list
        normalized['monthlyGrowth'] = stats['monthlyGrowth'] ?? [];

        // Derive health distribution from counts (fallback to simple buckets)
        final List<Map<String, dynamic>> distribution = [];
        if (total > 0) {
          distribution.add({'status': 'excellent', 'percentage': ((healthy / total) * 100).round()});
          distribution.add({'status': 'moyen', 'percentage': (((warning) / total) * 100).round()});
          distribution.add({'status': 'mauvais', 'percentage': (((critical) / total) * 100).round()});
        }
        normalized['healthDistribution'] = distribution;

        // Include recent activities if present
        normalized['recentActivities'] = stats['recentActivities'] ?? [];
      } else {
        // Already in expected (old) format — use directly but ensure keys exist
        normalized['totalTrees'] = stats['totalTrees'] ?? 0;
        normalized['treesWithFruits'] = stats['treesWithFruits'] ?? 0;
        normalized['healthyTrees'] = stats['healthyTrees'] ?? 0;
        normalized['needsAttention'] = stats['needsAttention'] ?? 0;
        normalized['monthlyGrowth'] = stats['monthlyGrowth'] ?? [];
        normalized['healthDistribution'] = stats['healthDistribution'] ?? [];
        normalized['recentActivities'] = stats['recentActivities'] ?? [];
      }

      setState(() {
        _stats = normalized;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _stats = {
          'totalTrees': 0,
          'treesWithFruits': 0,
          'healthyTrees': 0,
          'needsAttention': 0,
          'monthlyGrowth': [],
          'healthDistribution': [],
        };
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModernBackground(
      child: _isLoading
          ? const Center(
              child: FuturisticLoader(
                size: 60,
                color: Color(0xFF00E676),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(),
                  const SizedBox(height: 24),
                  _buildQuickStats(),
                  const SizedBox(height: 32),
                  _buildGrowthChart(),
                  const SizedBox(height: 32),
                  _buildHealthDistribution(),
                  const SizedBox(height: 32),
                  _buildRecentActivities(),
                  const SizedBox(height: 100), // Bottom padding for navigation bar
                ],
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NeonText(
          text: 'Dashboard',
          fontSize: 32,
          color: Color(0xFF00E676),
          fontWeight: FontWeight.bold,
        ),
        const SizedBox(height: 12),
        Text(
          'Vue d\'ensemble de vos arbres fruitiers',
          style: TextStyle(
            color: Colors.white.withOpacity(0.7),
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickStats() {
    if (_stats == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NeonText(
          text: 'Statistiques rapides',
          fontSize: 20,
          color: Color(0xFF00E676),
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.2,
          children: [
            _buildStatCard(
              'Total Arbres',
              _stats!['totalTrees'].toString(),
              Icons.eco,
              const Color(0xFF00E676),
            ),
            _buildStatCard(
              'Avec Fruits',
              _stats!['treesWithFruits'].toString(),
              Icons.agriculture,
              const Color(0xFF00E676),
            ),
            _buildStatCard(
              'En Bonne Santé',
              _stats!['healthyTrees'].toString(),
              Icons.favorite,
              const Color(0xFF00E676),
            ),
            _buildStatCard(
              'Besoin d\'Attention',
              _stats!['needsAttention'].toString(),
              Icons.warning,
              Colors.orange,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return GlassmorphismContainer(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 32,
            color: color,
          ),
          const SizedBox(height: 12),
          NeonText(
            text: value,
            fontSize: 24,
            color: color,
            fontWeight: FontWeight.bold,
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildGrowthChart() {
    if (_stats == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NeonText(
          text: 'Croissance Mensuelle',
          fontSize: 20,
          color: Color(0xFF00E676),
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 16),
        GlassmorphismContainer(
          padding: const EdgeInsets.all(20),
          child: _buildGrowthChartContent(),
        ),
      ],
    );
  }

  Widget _buildGrowthChartContent() {
    final monthlyGrowth = _stats!['monthlyGrowth'] as List? ?? [];
    
    if (monthlyGrowth.isEmpty) {
      return SizedBox(
        height: 200,
        child: Center(
          child: Text(
            'Aucune donnée de croissance disponible',
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 16,
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: monthlyGrowth.length,
        itemBuilder: (context, index) {
          final data = monthlyGrowth[index];
          final height = (data['value'] as num).toDouble() * 150 / 100;
          
          return Container(
            width: 60,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  height: height.clamp(10, 150),
                  width: 40,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        const Color(0xFF00E676),
                        const Color(0xFF00E676).withOpacity(0.6),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF00E676).withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  data['month'].toString().substring(0, 3),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHealthDistribution() {
    if (_stats == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NeonText(
          text: 'Distribution de Santé',
          fontSize: 20,
          color: Color(0xFF00E676),
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 16),
        GlassmorphismContainer(
          padding: const EdgeInsets.all(20),
          child: _buildHealthDistributionContent(),
        ),
      ],
    );
  }

  Widget _buildHealthDistributionContent() {
    final distribution = _stats!['healthDistribution'] as List? ?? [];
    
    if (distribution.isEmpty) {
      return SizedBox(
        height: 150,
        child: Center(
          child: Text(
            'Aucune donnée de santé disponible',
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 16,
            ),
          ),
        ),
      );
    }

    return Column(
      children: distribution.map<Widget>((item) {
        final percentage = (item['percentage'] as num).toDouble() / 100;
        final color = _getHealthColor(item['status']);
        
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    item['status'],
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    '${item['percentage']}%',
                    style: TextStyle(
                      color: color,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              FuturisticProgressBar(
                progress: percentage,
                color: color,
                height: 8,
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _getHealthColor(String status) {
    switch (status.toLowerCase()) {
      case 'excellent':
        return const Color(0xFF00E676);
      case 'bon':
        return const Color(0xFF4CAF50);
      case 'moyen':
        return Colors.orange;
      case 'mauvais':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildRecentActivities() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NeonText(
          text: 'Activités Récentes',
          fontSize: 20,
          color: Color(0xFF00E676),
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 16),
        GlassmorphismContainer(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildActivityItem(
                'Nouvelle localisation ajoutée',
                'Arbre fruitier - Pommier',
                'Il y a 2h',
                Icons.map,
              ),
              const SizedBox(height: 16),
              _buildActivityItem(
                'Mise à jour santé',
                'Statut changé vers "Excellent"',
                'Il y a 5h',
                Icons.favorite,
              ),
              const SizedBox(height: 16),
              _buildActivityItem(
                'Nouvelle plantation',
                'Ajout d\'un cerisier',
                'Hier',
                Icons.eco,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActivityItem(String title, String subtitle, String time, IconData icon) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF00E676).withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF00E676).withOpacity(0.3),
            ),
          ),
          child: Icon(
            icon,
            color: const Color(0xFF00E676),
            size: 20,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        Text(
          time,
          style: TextStyle(
            color: Colors.white.withOpacity(0.5),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
