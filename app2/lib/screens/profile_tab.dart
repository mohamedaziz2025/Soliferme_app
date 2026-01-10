import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../widgets/glassmorphism_widgets.dart';
import 'login_screen.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({Key? key}) : super(key: key);

  @override
  _ProfileTabState createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  bool _notificationsEnabled = true;
  bool _autoSync = true;
  String _syncFrequency = 'daily';
  bool _isLoading = true;
  String _name = '';
  String _email = '';
  String _role = '';

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _loadProfile();
  }

  Future<void> _loadSettings() async {
    try {
      final notificationService = Provider.of<NotificationService>(context, listen: false);
      _notificationsEnabled = await notificationService.areNotificationsEnabled();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur de chargement des paramètres: $e')),
        );
      }
    }
  }

  Future<void> _loadProfile() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final userData = authService.userData;
      if (userData != null) {
        setState(() {
          _name = userData['name'] ?? '';
          _email = userData['email'] ?? '';
          _role = userData['role'] ?? '';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur de chargement du profil: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _logout() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.logout();
      if (!mounted) return;
      
      // Navigate to login screen and clear navigation stack
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (Route<dynamic> route) => false,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de la déconnexion: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModernBackground(
      child: _isLoading 
        ? Center(
            child: GlassmorphismContainer(
              child: const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.cyanAccent),
              ),
            ),
          )
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Profile Header
                GlassmorphismContainer(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [
                              Colors.cyanAccent.withOpacity(0.8),
                              Colors.purpleAccent.withOpacity(0.8),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.cyanAccent.withOpacity(0.3),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.person,
                          size: 50,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 20),
                      NeonText(
                        text: _name.isNotEmpty ? _name : 'Utilisateur',
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _email.isNotEmpty ? _email : 'email@example.com',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white70,
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: _role == 'admin' 
                              ? [Colors.orange.withOpacity(0.3), Colors.deepOrange.withOpacity(0.3)]
                              : [Colors.blue.withOpacity(0.3), Colors.indigo.withOpacity(0.3)],
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _role == 'admin' ? Colors.orange : Colors.blue,
                            width: 1,
                          ),
                        ),
                        child: Text(
                          _role == 'admin' ? '👑 Administrateur' : '👤 Utilisateur',
                          style: TextStyle(
                            color: _role == 'admin' ? Colors.orange[300] : Colors.blue[300],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Settings Section
                GlassmorphismContainer(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      NeonText(
                        text: '⚙️ Paramètres',
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      const SizedBox(height: 20),
                      
                      // Notifications Toggle
                      _buildModernSwitch(
                        title: '🔔 Notifications',
                        subtitle: 'Recevoir les notifications push',
                        value: _notificationsEnabled,
                        onChanged: (bool value) async {
                          final notificationService = Provider.of<NotificationService>(context, listen: false);
                          final success = await notificationService.setNotificationsEnabled(value);
                          if (success) {
                            setState(() => _notificationsEnabled = value);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Auto Sync Toggle
                      _buildModernSwitch(
                        title: '🔄 Synchronisation auto',
                        subtitle: 'Synchroniser automatiquement',
                        value: _autoSync,
                        onChanged: (bool value) {
                          setState(() => _autoSync = value);
                        },
                      ),
                      const SizedBox(height: 20),
                      
                      // Sync Frequency
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.white.withOpacity(0.1),
                              Colors.white.withOpacity(0.05),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '📅 Fréquence de synchronisation',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.cyanAccent.withOpacity(0.2),
                                    Colors.purpleAccent.withOpacity(0.2),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Colors.cyanAccent.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: DropdownButton<String>(
                                value: _syncFrequency,
                                dropdownColor: Colors.grey[900],
                                underline: Container(),
                                icon: Icon(Icons.keyboard_arrow_down, color: Colors.cyanAccent),
                                style: TextStyle(color: Colors.white),
                                onChanged: (String? value) {
                                  if (value != null) {
                                    setState(() => _syncFrequency = value);
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(
                                    value: 'daily',
                                    child: Text('📅 Quotidienne'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'weekly',
                                    child: Text('📆 Hebdomadaire'),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Actions Section
                GlassmorphismContainer(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      ModernGradientButton(
                        text: '🔐 Changer le mot de passe',
                        onPressed: () {
                          // TODO: Implement change password
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Fonctionnalité à venir'),
                              backgroundColor: Colors.blue.withOpacity(0.8),
                            ),
                          );
                        },
                        primaryColor: const Color(0xFF66BB6A),
                      ),
                      const SizedBox(height: 16),
                      ModernGradientButton(
                        text: '🚪 Se déconnecter',
                        onPressed: _logout,
                        primaryColor: const Color(0xFF81C784),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
    );
  }

  Widget _buildModernSwitch({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withOpacity(0.1),
            Colors.white.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          Transform.scale(
            scale: 1.2,
            child: Switch(
              value: value,
              onChanged: onChanged,
              activeColor: Colors.cyanAccent,
              activeTrackColor: Colors.cyanAccent.withOpacity(0.3),
              inactiveThumbColor: Colors.grey[400],
              inactiveTrackColor: Colors.grey.withOpacity(0.3),
            ),
          ),
        ],
      ),
    );
  }
}