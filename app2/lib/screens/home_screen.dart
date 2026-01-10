import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../widgets/glassmorphism_widgets.dart';
import 'dashboard_tab.dart';
import 'trees_tab.dart';
import 'map_tab.dart';
import 'profile_tab.dart';
import 'admin_tab.dart';
import 'dart:ui';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  List<Widget> _getTabs(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final isAdmin = authService.role == 'admin';

    final List<Widget> tabs = [
      const DashboardTab(),
      if (!isAdmin) const TreesTab(),
      const MapTab(),
      if (isAdmin) const AdminTab(),
      const ProfileTab(),
    ];

    return tabs;
  }

  List<NavigationDestination> _getDestinations(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final isAdmin = authService.role == 'admin';

    final List<NavigationDestination> destinations = [
      const NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Tableau de bord',
      ),
      if (!isAdmin)
        const NavigationDestination(
          icon: Icon(Icons.forest_outlined),
          selectedIcon: Icon(Icons.forest),
          label: 'Arbres',
        ),
      const NavigationDestination(
        icon: Icon(Icons.map_outlined),
        selectedIcon: Icon(Icons.map),
        label: 'Carte',
      ),
      if (isAdmin)
        const NavigationDestination(
          icon: Icon(Icons.admin_panel_settings_outlined),
          selectedIcon: Icon(Icons.admin_panel_settings),
          label: 'Admin',
        ),
      const NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: 'Profil',
      ),
    ];

    return destinations;
  }

  @override
  Widget build(BuildContext context) {
    final tabs = _getTabs(context);
    final destinations = _getDestinations(context);

    return ModernBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: NeonText(
            text: '🌲 FruityTrack',
            fontSize: 24,
            fontWeight: FontWeight.w700,
          ),
          centerTitle: true,
          flexibleSpace: ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.1),
                  border: Border(
                    bottom: BorderSide(
                      color: Colors.white.withOpacity(0.1),
                      width: 1,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: tabs,
        ),
        bottomNavigationBar: Container(
          margin: const EdgeInsets.all(16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(25),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.1),
                    width: 1,
                  ),
                ),
                child: NavigationBar(
                  selectedIndex: _currentIndex,
                  onDestinationSelected: (index) {
                    setState(() {
                      _currentIndex = index;
                    });
                  },
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  indicatorColor: const Color(0xFF00E676).withOpacity(0.2),
                  destinations: destinations.map((destination) {
                    final isSelected = destinations.indexOf(destination) == _currentIndex;
                    return NavigationDestination(
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: isSelected 
                            ? const Color(0xFF00E676).withOpacity(0.2)
                            : Colors.transparent,
                        ),
                        child: Icon(
                          isSelected 
                            ? (destination.selectedIcon as Icon).icon
                            : (destination.icon as Icon).icon,
                          color: isSelected 
                            ? const Color(0xFF00E676)
                            : Colors.white.withOpacity(0.7),
                          size: 24,
                        ),
                      ),
                      selectedIcon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: const Color(0xFF00E676).withOpacity(0.2),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF00E676).withOpacity(0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Icon(
                          (destination.selectedIcon as Icon).icon,
                          color: const Color(0xFF00E676),
                          size: 24,
                        ),
                      ),
                      label: destination.label,
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}