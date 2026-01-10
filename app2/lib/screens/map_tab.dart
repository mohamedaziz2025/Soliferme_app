import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';
import '../widgets/glassmorphism_widgets.dart';
import 'tree_details_screen.dart';
import 'package:vector_math/vector_math_64.dart' show Matrix4;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:math' as math;

class MapTab extends StatefulWidget {
  const MapTab({Key? key}) : super(key: key);

  @override
  _MapTabState createState() => _MapTabState();
}

// Define a class to hold tree marker info for popups
class TreeMarkerInfo {
  final Map<String, dynamic> tree;
  final LatLng position;
  final Color color;
  final String id;
  
  TreeMarkerInfo(this.tree, this.position, this.color) 
      : id = tree['treeId']?.toString() ?? tree['id']?.toString() ?? '';
}

class _MapTabState extends State<MapTab> with TickerProviderStateMixin {
  bool _isLoading = true;
  List<Map<String, dynamic>> _trees = [];
  final TransformationController _transformationController = TransformationController();
  double _currentScale = 1.0;
  final MapController _mapController = MapController();
  TreeMarkerInfo? _selectedMarker;
  
  // Animation controller for marker pulse effect
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _loadTrees();
    
    // Initialize pulse animation
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut)
    );
  }

  Future<void> _loadTrees() async {
    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      final trees = await treeService.getAllTrees();
      setState(() {
        _trees = trees;
        _isLoading = false;
      });
      // Optionally center on first tree after load
      if (_trees.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _centerOnTree(_trees[0]);
        });
      }
    } catch (e) {
      setState(() {
        _trees = [];
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur chargement arbres: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return ModernBackground(
        child: const Center(
          child: FuturisticLoader(
            size: 60,
            color: Color(0xFF00E676),
          ),
        ),
      );
    }

    if (_trees.isEmpty) {
      return ModernBackground(
        child: Center(
          child: GlassmorphismContainer(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.forest, size: 64, color: Colors.white70),
                const SizedBox(height: 16),
                const Text('Aucun arbre disponible', style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 12),
                ModernGradientButton(
                  text: 'Rafraîchir',
                  onPressed: _loadTrees,
                ),
              ],
            ),
          ),
        ),
      );
    }

    double minLat = double.infinity, maxLat = -double.infinity;
    double minLon = double.infinity, maxLon = -double.infinity;
    for (final t in _trees) {
      final loc = t['location'] as Map<String, dynamic>?;
      if (loc == null) continue;
      final lat = (loc['latitude'] ?? 0).toDouble();
      final lon = (loc['longitude'] ?? 0).toDouble();
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    if (minLat == double.infinity || minLon == double.infinity) {
      minLat = 0; maxLat = 1; minLon = 0; maxLon = 1;
    }
    if ((maxLat - minLat).abs() < 0.0001) {
      maxLat = minLat + 0.01;
    }
    if ((maxLon - minLon).abs() < 0.0001) {
      maxLon = minLon + 0.01;
    }

    const mapWidth = 1200.0;
    const mapHeight = 700.0;

    // Responsive layout: left list (like web), right interactive canvas map
    return ModernBackground(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const NeonText(text: 'Carte des arbres', fontSize: 28, fontWeight: FontWeight.bold),
            const SizedBox(height: 12),

            Expanded(
              child: LayoutBuilder(builder: (context, constraints) {
                final showList = constraints.maxWidth > 900; // breakpoint to show left list
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Left list column
                    if (showList)
                      SizedBox(
                        width: 360,
                        child: GlassmorphismContainer(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const NeonText(text: 'Arbres', fontSize: 20, fontWeight: FontWeight.w600),
                                  Row(children: [
                                    IconButton(
                                      tooltip: 'Actualiser',
                                      onPressed: _loadTrees,
                                      icon: const Icon(Icons.refresh, color: Colors.white),
                                    ),
                                  ]),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Expanded(
                                child: _isLoading
                                    ? const Center(child: FuturisticLoader(size: 40, color: Color(0xFF00E676)))
                                    : ListView.separated(
                                        itemCount: _trees.length,
                                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                                        itemBuilder: (context, i) {
                                          final t = _trees[i];
                                          final status = (t['status'] ?? 'healthy').toString();
                                          return GestureDetector(
                                            onTap: () {
                                              _centerOnTree(t);
                                              // Sélectionnez l'arbre sur la carte au lieu d'ouvrir les détails
                                              final loc = t['location'] as Map<String, dynamic>? ?? {};
                                              final lat = (loc['latitude'] ?? 0).toDouble();
                                              final lon = (loc['longitude'] ?? 0).toDouble();
                                              final treePosition = LatLng(lat, lon);
                                              
                                              // Déterminer la couleur selon le statut
                                              final status = (t['status'] ?? 'healthy').toString().toLowerCase();
                                              Color markerColor = Colors.greenAccent;
                                              switch (status) {
                                                case 'warning':
                                                  markerColor = Colors.orangeAccent;
                                                  break;
                                                case 'critical':
                                                  markerColor = Colors.redAccent;
                                                  break;
                                                case 'archived':
                                                  markerColor = Colors.grey;
                                                  break;
                                              }
                                              
                                              setState(() {
                                                _selectedMarker = TreeMarkerInfo(t, treePosition, markerColor);
                                              });
                                            },
                                            child: GlassmorphismContainer(
                                              padding: const EdgeInsets.all(12),
                                              child: Row(
                                                children: [
                                                  Container(
                                                    width: 48,
                                                    height: 48,
                                                    decoration: BoxDecoration(
                                                      shape: BoxShape.circle,
                                                      gradient: LinearGradient(colors: [
                                                        status == 'healthy' ? Colors.greenAccent : Colors.grey,
                                                        status == 'healthy' ? Colors.green : Colors.black12,
                                                      ]),
                                                    ),
                                                    child: Center(
                                                      child: Text(
                                                        (t['treeType'] ?? 'T').toString().substring(0, 1).toUpperCase(),
                                                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 12),
                                                  Expanded(
                                                    child: Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text('Arbre #${t['treeId'] ?? t['id'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
                                                        const SizedBox(height: 4),
                                                        Text(t['treeType']?.toString() ?? 'Type inconnu', style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 12)),
                                                      ],
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Column(
                                                    children: [
                                                      Icon(Icons.circle, size: 12, color: status == 'healthy' ? Colors.greenAccent : status == 'warning' ? Colors.orange : status == 'critical' ? Colors.red : Colors.grey),
                                                    ],
                                                  )
                                                ],
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Map area
                    Expanded(
                      child: GlassmorphismContainer(
                        padding: const EdgeInsets.all(12),
                        child: Stack(
                          children: [
                            FlutterMap(
                              mapController: _mapController,
                              options: MapOptions(
                                initialCenter: _trees.isNotEmpty
                                    ? LatLng(
                                        (_trees[0]['location']?['latitude'] ?? 36.8065).toDouble(),
                                        (_trees[0]['location']?['longitude'] ?? 10.1815).toDouble(),
                                      )
                                    : LatLng(36.8065, 10.1815),
                                initialZoom: 13.0,
                                onTap: (tapPosition, point) {
                                  // Close any open popup when tapping elsewhere on map
                                  setState(() {
                                    _selectedMarker = null;
                                  });
                                },
                              ),
                              children: [
                                TileLayer(
                                  urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                                  subdomains: const ['a', 'b', 'c'],
                                  userAgentPackageName: 'frutytrack.app',
                                  tileSize: 256.0,
                                  tileBuilder: (context, widget, tile) {
                                    return Container(
                                      decoration: BoxDecoration(
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.1),
                                            blurRadius: 1,
                                          ),
                                        ],
                                      ),
                                      child: widget,
                                    );
                                  },
                                  // Attribution handled via separate widget
                                ),
                                MarkerLayer(
                                  markers: _trees.map<Marker>((t) {
                                    final loc = t['location'] as Map<String, dynamic>? ?? {};
                                    final lat = (loc['latitude'] ?? 0).toDouble();
                                    final lon = (loc['longitude'] ?? 0).toDouble();

                                    final status = (t['status'] ?? 'healthy').toString().toLowerCase();
                                    Color markerColor = Colors.greenAccent;
                                    
                                    switch (status) {
                                      case 'warning':
                                        markerColor = Colors.orangeAccent;
                                        break;
                                      case 'critical':
                                        markerColor = Colors.redAccent;
                                        break;
                                      case 'archived':
                                        markerColor = Colors.grey;
                                        break;
                                      default:
                                        markerColor = Colors.greenAccent;
                                    }
                                    
                                    final treePosition = LatLng(lat, lon);
                                    final isSelected = _selectedMarker?.tree['_id'] == t['_id'] ||
                                        _selectedMarker?.tree['treeId'] == t['treeId'];

                                    return Marker(
                                      width: 60,
                                      height: isSelected ? 120 : 64, // Taller when popup is open
                                      point: treePosition,
                                      child: GestureDetector(
                                        onTap: () {
                                          final treeId = t['treeId']?.toString() ?? t['id']?.toString() ?? '';
                                          final isAlreadySelected = _selectedMarker?.id == treeId;
                                          
                                          // Move to the tree's position with a slightly higher zoom level
                                          _mapController.move(
                                            treePosition,
                                            isAlreadySelected ? _mapController.camera.zoom : _mapController.camera.zoom + 0.5,
                                          );
                                          
                                          // Toggle marker popup
                                          setState(() {
                                            if (isAlreadySelected) {
                                              _selectedMarker = null; // Close if already open
                                            } else {
                                              _selectedMarker = TreeMarkerInfo(t, treePosition, markerColor);
                                            }
                                          });
                                        },
                                        child: Stack(
                                          clipBehavior: Clip.none, // Allow popup to overflow
                                          children: [
                                            // Tree marker
                                            Column(
                                              children: [
                                                AnimatedBuilder(
                                                  animation: _pulseAnimation,
                                                  builder: (context, child) {
                                                    // Check if this is the selected tree
                                                    final String treeId = t['treeId']?.toString() ?? t['id']?.toString() ?? '';
                                                    final bool isSelected = _selectedMarker?.id == treeId;
                                                    
                                                    return Transform.scale(
                                                      scale: isSelected ? _pulseAnimation.value : 1.0,
                                                      child: Container(
                                                        width: 36,
                                                        height: 36,
                                                        decoration: BoxDecoration(
                                                          shape: BoxShape.circle,
                                                          color: markerColor,
                                                          boxShadow: [
                                                            BoxShadow(
                                                              color: markerColor.withOpacity(isSelected ? 0.8 : 0.6),
                                                              blurRadius: isSelected ? 15 : 10,
                                                              spreadRadius: isSelected ? 3 : 2,
                                                            ),
                                                            BoxShadow(
                                                              color: Colors.black.withOpacity(0.4),
                                                              blurRadius: 6,
                                                            ),
                                                          ],
                                                          border: Border.all(
                                                            color: isSelected ? Colors.white : Colors.white.withOpacity(0.8), 
                                                            width: isSelected ? 3 : 2
                                                          ),
                                                        ),
                                                        child: Center(
                                                          child: Text(
                                                            treeId.isNotEmpty ? treeId.substring(0, 1) : '?',
                                                            style: TextStyle(
                                                              color: Colors.black, 
                                                              fontWeight: FontWeight.bold,
                                                              fontSize: isSelected ? 16 : 14,
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                    );
                                                  },
                                                ),
                                                const SizedBox(height: 6),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                                  decoration: BoxDecoration(
                                                    color: Colors.black.withOpacity(0.6),
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: Text(
                                                    t['treeType']?.toString() ?? 'Arbre',
                                                    style: const TextStyle(color: Colors.white, fontSize: 12),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            
                                            // Popup info window when selected
                                            if (isSelected)
                                              Positioned(
                                                top: 64,
                                                left: -80, // Center wider popup relative to marker
                                                width: 220,
                                                child: GlassmorphismContainer(
                                                  padding: const EdgeInsets.all(12),
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      Row(
                                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                        children: [
                                                          Expanded(
                                                            child: Text(
                                                              'Arbre #${t['treeId'] ?? t['id'] ?? '-'}',
                                                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                                            ),
                                                          ),
                                                          GestureDetector(
                                                            onTap: () {
                                                              setState(() => _selectedMarker = null);
                                                            },
                                                            child: const Icon(Icons.close, size: 18, color: Colors.white70),
                                                          ),
                                                        ],
                                                      ),
                                                      const Divider(color: Colors.white24),
                                                      Row(
                                                        children: [
                                                          const Icon(Icons.park, size: 14, color: Colors.white70),
                                                          const SizedBox(width: 8),
                                                          Text(t['treeType']?.toString() ?? 'Type inconnu',
                                                              style: const TextStyle(color: Colors.white)),
                                                        ],
                                                      ),
                                                      const SizedBox(height: 8),
                                                      Row(
                                                        children: [
                                                          Expanded(
                                                            child: Column(
                                                              crossAxisAlignment: CrossAxisAlignment.start,
                                                              children: [
                                                                if (t['health'] != null)
                                                                  Padding(
                                                                    padding: const EdgeInsets.only(bottom: 8.0),
                                                                    child: Row(
                                                                      children: [
                                                                        Icon(Icons.spa, size: 14, color: markerColor),
                                                                        const SizedBox(width: 4),
                                                                        Text(
                                                                          'Santé: ${t['health']?.toString() ?? "Normal"}',
                                                                          style: const TextStyle(color: Colors.white),
                                                                        ),
                                                                      ],
                                                                    ),
                                                                  ),
                                                                if (t['lastWatered'] != null)
                                                                  Padding(
                                                                    padding: const EdgeInsets.only(bottom: 4.0),
                                                                    child: Row(
                                                                      children: [
                                                                        const Icon(Icons.water_drop, size: 14, color: Colors.lightBlue),
                                                                        const SizedBox(width: 4),
                                                                        Text(
                                                                          'Dernier arrosage: ${t['lastWatered']?.toString() ?? "Inconnu"}',
                                                                          style: const TextStyle(color: Colors.white),
                                                                        ),
                                                                      ],
                                                                    ),
                                                                  ),
                                                              ],
                                                            ),
                                                          ),
                                                          ModernGradientButton(
                                                            text: 'Fermer',
                                                            onPressed: () {
                                                              setState(() => _selectedMarker = null);
                                                            },
                                                            isPrimary: false,
                                                            icon: Icons.close,
                                                            height: 40,
                                                          ),
                                                        ],
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),

                            // Overlay controls: top-right
                            Positioned(
                              right: 16,
                              top: 16,
                              child: Column(
                                children: [
                                  // Glass container for map controls
                                  GlassmorphismContainer(
                                    padding: const EdgeInsets.all(8),
                                    child: Column(
                                      children: [
                                        // Zoom in button
                                        IconButton(
                                          icon: const Icon(Icons.add, color: Colors.white),
                                          onPressed: () {
                                            final currentZoom = _mapController.camera.zoom;
                                            _mapController.move(
                                              _mapController.camera.center,
                                              currentZoom + 1.0,
                                            );
                                          },
                                        ),
                                        const Divider(height: 2, thickness: 1, color: Colors.white24),
                                        // Zoom out button
                                        IconButton(
                                          icon: const Icon(Icons.remove, color: Colors.white),
                                          onPressed: () {
                                            final currentZoom = _mapController.camera.zoom;
                                            _mapController.move(
                                              _mapController.camera.center,
                                              currentZoom - 1.0,
                                            );
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                  
                                  const SizedBox(height: 12),
                                  
                                  FloatingActionButton.small(
                                    heroTag: 'refresh_map',
                                    backgroundColor: const Color(0xFF00E676),
                                    onPressed: _loadTrees,
                                    child: const Icon(Icons.refresh, color: Colors.black),
                                  ),
                                  const SizedBox(height: 8),
                                  FloatingActionButton.small(
                                    heroTag: 'fit_all_trees',
                                    backgroundColor: Colors.white24,
                                    onPressed: _fitAllTrees,
                                    tooltip: 'Voir tous les arbres',
                                    child: const Icon(Icons.zoom_out_map, color: Colors.white),
                                  ),
                                  const SizedBox(height: 8),
                                  FloatingActionButton.small(
                                    heroTag: 'center_map',
                                    backgroundColor: Colors.white24,
                                    onPressed: () {
                                      // If a tree is selected, center on it
                                      if (_selectedMarker != null) {
                                        _mapController.move(
                                          _selectedMarker!.position,
                                          15.0,
                                        );
                                      } 
                                      // Otherwise center on the first tree or default position
                                      else if (_trees.isNotEmpty) {
                                        final first = _trees[0]['location'];
                                        final lat = (first?['latitude'] ?? 36.8065).toDouble();
                                        final lon = (first?['longitude'] ?? 10.1815).toDouble();
                                        _mapController.move(
                                          LatLng(lat, lon),
                                          14.0,
                                        );
                                      }
                                    },
                                    tooltip: 'Centrer la carte',
                                    child: const Icon(Icons.center_focus_strong, color: Colors.white),
                                  ),
                                  const SizedBox(height: 8),
                                  FloatingActionButton.small(
                                    heroTag: 'my_location',
                                    backgroundColor: const Color(0xFF00E676),
                                    onPressed: () {
                                      // Simulate going to user's location (fixed position for now)
                                      // In a real app, you would get the actual GPS position
                                      _mapController.move(
                                        LatLng(36.8065, 10.1815),
                                        16.0,
                                      );
                                      
                                      // Show a simulated "current position" marker
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Position simulée (pour démonstration)'),
                                          duration: Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    tooltip: 'Ma position',
                                    child: const Icon(Icons.my_location, color: Colors.black),
                                  ),
                                ],
                              ),
                            ),

                            // Legend bottom-left
                            Positioned(
                              left: 12,
                              bottom: 12,
                              child: GlassmorphismContainer(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _legendDot(Colors.greenAccent, 'En bonne santé'),
                                    const SizedBox(width: 8),
                                    _legendDot(Colors.orangeAccent, 'À surveiller'),
                                    const SizedBox(width: 8),
                                    _legendDot(Colors.redAccent, 'Critique'),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  void _centerOnTree(Map<String, dynamic> t) {
    final loc = t['location'] as Map<String, dynamic>? ?? {};
    final lat = (loc['latitude'] ?? 0).toDouble();
    final lon = (loc['longitude'] ?? 0).toDouble();

    // Use flutter_map controller to move to the tree location
    _mapController.move(
      LatLng(lat, lon),
      15.0, // Zoom in closer to the tree
    );
  }
  
  void _fitAllTrees() {
    if (_trees.isEmpty) return;
    
    // Find the bounds that include all trees
    double minLat = 90.0, maxLat = -90.0;
    double minLng = 180.0, maxLng = -180.0;
    
    for (final tree in _trees) {
      final loc = tree['location'] as Map<String, dynamic>?;
      if (loc == null) continue;
      
      final lat = (loc['latitude'] ?? 0.0).toDouble();
      final lng = (loc['longitude'] ?? 0.0).toDouble();
      
      minLat = math.min(minLat, lat);
      maxLat = math.max(maxLat, lat);
      minLng = math.min(minLng, lng);
      maxLng = math.max(maxLng, lng);
    }
    
    // Add padding to bounds
    final latPadding = (maxLat - minLat) * 0.1;
    final lngPadding = (maxLng - minLng) * 0.1;
    
    // Create bounds with padding
    final bounds = LatLngBounds(
      LatLng(minLat - latPadding, minLng - lngPadding),
      LatLng(maxLat + latPadding, maxLng + lngPadding),
    );
    
    // Calculate center point and appropriate zoom level
    final center = bounds.center;
    
    // Use a lower zoom level to show all trees
    // This is a simple approach since fitCamera with CameraFit.bounds is problematic
    double zoomLevel = 13.0; // Default zoom level
    
    // Move to the center of all trees
    _mapController.move(center, zoomLevel);
    
    // Close any open popup when fitting all trees
    setState(() {
      _selectedMarker = null;
    });
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }
}
