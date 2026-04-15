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
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value.toString()) ?? 0;
  }

  List<Map<String, dynamic>> _normalizeMonthlyGrowth(dynamic rawGrowth) {
    if (rawGrowth is List) {
      return rawGrowth
          .map((item) {
            if (item is! Map) return null;
            final month = item['month']?.toString() ?? item['label']?.toString() ?? '';
            if (month.isEmpty) return null;
            return {
              'month': month,
              'value': _toInt(item['value'] ?? item['count'] ?? item['total']),
            };
          })
          .whereType<Map<String, dynamic>>()
          .toList();
    }

    if (rawGrowth is Map && rawGrowth['labels'] is List && rawGrowth['data'] is List) {
      final labels = List<dynamic>.from(rawGrowth['labels']);
      final data = List<dynamic>.from(rawGrowth['data']);
      final length = labels.length < data.length ? labels.length : data.length;

      return List.generate(length, (index) {
        return {
          'month': labels[index].toString(),
          'value': _toInt(data[index]),
        };
      });
    }

    return [];
  }

  List<Map<String, dynamic>> _normalizeHealthDistribution(
    dynamic rawDistribution,
    int total,
    int healthy,
    int warning,
    int critical,
  ) {
    if (rawDistribution is List) {
      return rawDistribution
          .map((item) {
            if (item is! Map) return null;
            final status = item['status']?.toString() ?? item['label']?.toString() ?? '';
            if (status.isEmpty) return null;
            return {
              'status': status,
              'percentage': _toInt(item['percentage'] ?? item['value']),
            };
          })
          .whereType<Map<String, dynamic>>()
          .toList();
    }

    if (rawDistribution is Map && rawDistribution['labels'] is List && rawDistribution['data'] is List) {
      final labels = List<dynamic>.from(rawDistribution['labels']);
      final data = List<dynamic>.from(rawDistribution['data']);
      final length = labels.length < data.length ? labels.length : data.length;

      return List.generate(length, (index) {
        final label = labels[index].toString().toLowerCase();
        String status = 'moyen';
        if (label.contains('bonne') || label.contains('sante')) {
          status = 'excellent';
        } else if (label.contains('surve')) {
          status = 'moyen';
        } else if (label.contains('crit')) {
          status = 'mauvais';
        }

        final value = _toInt(data[index]);
        final percentage = total > 0 ? ((value / total) * 100).round() : 0;
        return {
          'status': status,
          'percentage': percentage,
        };
      });
    }

    if (total <= 0) return [];

    return [
      {'status': 'excellent', 'percentage': ((healthy / total) * 100).round()},
      {'status': 'moyen', 'percentage': ((warning / total) * 100).round()},
      {'status': 'mauvais', 'percentage': ((critical / total) * 100).round()},
    ];
  }

  Map<String, dynamic> _normalizeDashboardStats(Map<String, dynamic> stats) {
    final Map<String, dynamic> normalized = {};

    if (stats.containsKey('trees')) {
      final trees = Map<String, dynamic>.from(stats['trees'] ?? {});
      final total = _toInt(trees['total']);
      final healthy = _toInt(trees['healthy']);
      final warning = _toInt(trees['warning']);
      final critical = _toInt(trees['critical']);

      normalized['totalTrees'] = total;
      normalized['treesWithFruits'] =
          _toInt(trees['withFruits'] ?? trees['treesWithFruits']);
      normalized['healthyTrees'] = healthy;
      normalized['needsAttention'] = warning + critical;
      normalized['monthlyGrowth'] = _normalizeMonthlyGrowth(stats['monthlyGrowth']);
      normalized['healthDistribution'] = _normalizeHealthDistribution(
        stats['healthDistribution'],
        total,
        healthy,
        warning,
        critical,
      );
      normalized['recentActivities'] =
          stats['recentActivities'] is List ? stats['recentActivities'] : [];
      return normalized;
    }

    final totalTrees = _toInt(stats['totalTrees'] ?? stats['total']);
    final healthyTrees = _toInt(stats['healthyTrees'] ?? stats['healthy']);
    final warningTrees = _toInt(stats['warningTrees'] ?? stats['warning']);
    final criticalTrees = _toInt(stats['criticalTrees'] ?? stats['critical']);

    normalized['totalTrees'] = totalTrees;
    normalized['treesWithFruits'] = _toInt(stats['treesWithFruits']);
    normalized['healthyTrees'] = healthyTrees;
    normalized['needsAttention'] = _toInt(stats['needsAttention']) > 0
        ? _toInt(stats['needsAttention'])
        : warningTrees + criticalTrees;
    normalized['monthlyGrowth'] = _normalizeMonthlyGrowth(stats['monthlyGrowth']);
    normalized['healthDistribution'] = _normalizeHealthDistribution(
      stats['healthDistribution'],
      totalTrees,
      healthyTrees,
      warningTrees,
      criticalTrees,
    );
    normalized['recentActivities'] =
        stats['recentActivities'] is List ? stats['recentActivities'] : [];

    return normalized;
  }

  Future<void> _loadDashboardData() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final stats = await _apiService.getDashboardStats();
      final normalized = _normalizeDashboardStats(stats);

      setState(() {
        _stats = normalized;
        _isLoading = false;
        _errorMessage = null;
      });
    } catch (_) {
      // Fallback to tree stats endpoint so dashboard still renders DB data.
      try {
        final fallbackStats = await _apiService.getTreeStats();
        final normalized = _normalizeDashboardStats(fallbackStats);

        setState(() {
          _stats = normalized;
          _isLoading = false;
          _errorMessage =
              'Donnees partielles affichees (service dashboard indisponible).';
        });
      } catch (_) {
        setState(() {
          _isLoading = false;
          _errorMessage =
              'Impossible de charger les donnees depuis la base. Verifiez la connexion API.';
          _stats = {
            'totalTrees': 0,
            'treesWithFruits': 0,
            'healthyTrees': 0,
            'needsAttention': 0,
            'monthlyGrowth': [],
            'healthDistribution': [],
            'recentActivities': [],
          };
        });
      }
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
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              color: const Color(0xFF00E676),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildHeader(),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 16),
                    _buildErrorBanner(_errorMessage!),
                  ],
                  const SizedBox(height: 24),
                  _buildQuickStats(),
                  const SizedBox(height: 32),
                  _buildGrowthChart(),
                  const SizedBox(height: 32),
                  _buildHealthDistribution(),
                  const SizedBox(height: 32),
                  _buildRecentActivities(),
                  const SizedBox(height: 100),
                ],
              ),
            ),
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withOpacity(0.4)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: Colors.orangeAccent),
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
              'En Bonne Sante',
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
          Icon(icon, size: 32, color: color),
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
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
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
            'Aucune donnee de croissance disponible',
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 16,
            ),
          ),
        ),
      );
    }

    final maxValue = monthlyGrowth
        .map((e) => _toInt((e as Map)['value']))
        .fold<int>(1, (prev, curr) => curr > prev ? curr : prev);

    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: monthlyGrowth.length,
        itemBuilder: (context, index) {
          final data = monthlyGrowth[index] as Map;
          final value = _toInt(data['value']);
          final ratio = maxValue > 0 ? value / maxValue : 0;
          final height = ratio * 150;

          return Container(
            width: 60,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  height: height.clamp(10.0, 150.0).toDouble(),
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
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  (() {
                    final month = data['month'].toString();
                    return month.length > 3 ? month.substring(0, 3) : month;
                  })(),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value.toString(),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 11,
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
          text: 'Distribution de Sante',
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
            'Aucune donnee de sante disponible',
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
        final status = item['status'].toString();
        final percentage = (_toInt(item['percentage']) / 100).clamp(0.0, 1.0);
        final color = _getHealthColor(status);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    status,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    '${_toInt(item['percentage'])}%',
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
      case 'warning':
        return Colors.orange;
      case 'mauvais':
      case 'critical':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildRecentActivities() {
    final activities = (_stats?['recentActivities'] as List?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NeonText(
          text: 'Activites Recentes',
          fontSize: 20,
          color: Color(0xFF00E676),
          fontWeight: FontWeight.w600,
        ),
        const SizedBox(height: 16),
        GlassmorphismContainer(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: activities.isEmpty
                ? [
                    _buildActivityItem(
                      'Aucune activite recente',
                      'Les nouvelles actions apparaitront ici',
                      'Maintenant',
                      Icons.info_outline,
                    ),
                  ]
                : activities.take(3).map((activity) {
                    final map = activity is Map ? activity : {};
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildActivityItem(
                        map['title']?.toString() ?? 'Mise a jour',
                        map['description']?.toString() ?? 'Activite enregistree',
                        map['time']?.toString() ?? 'recent',
                        Icons.timeline,
                      ),
                    );
                  }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildActivityItem(
    String title,
    String subtitle,
    String time,
    IconData icon,
  ) {
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
