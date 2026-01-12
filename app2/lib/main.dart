import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'services/notification_service.dart';
import 'services/tree_service.dart';
import 'services/api_service.dart';
import 'services/network_service.dart';
import 'services/background_sync_handler.dart';
import 'services/permission_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/tree_details_screen.dart';
import 'screens/admin_add_tree_screen.dart';
import 'screens/admin_edit_tree_screen.dart';
import 'screens/tree_analysis_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final authService = AuthService();
  await authService.initialize();

  // Initialize core services
  final networkService = NetworkService();
  await networkService.initialize();

  final notificationService = NotificationService();
  await notificationService.initialize();
  
  final permissionService = PermissionService();
  final apiService = ApiService();
  final treeService = TreeService(apiService); // Updated to pass apiService
  
  // Initialize background sync only on mobile platforms
  if (!kIsWeb) {
    final backgroundSyncHandler = BackgroundSyncHandler();
    await backgroundSyncHandler.initialize();
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthService>.value(value: authService),
        Provider<NotificationService>.value(value: notificationService),
        Provider<NetworkService>.value(value: networkService),
        Provider<PermissionService>.value(value: permissionService),
        Provider<TreeService>.value(value: treeService),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  ThemeData _buildModernTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      
      // Ultra Modern Futuristic Color Scheme
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF00E676), // Neon green
        primaryContainer: Color(0xFF1A4D3A),
        secondary: Color(0xFF4CAF50), // Secondary green
        secondaryContainer: Color(0xFF2E5233),
        tertiary: Color(0xFF66BB6A), // Light green
        surface: Color(0xFF0F0F0F), // Almost black surface
        surfaceVariant: Color(0xFF1A1A1A), // Dark variant
        surfaceContainerHighest: Color(0xFF262626),
        background: Color(0xFF000000), // Pure black
        onPrimary: Color(0xFF000000),
        onPrimaryContainer: Color(0xFF00E676),
        onSecondary: Color(0xFF000000),
        onSurface: Color(0xFFFFFFFF),
        onBackground: Color(0xFFFFFFFF),
        onSurfaceVariant: Color(0xFFE0E0E0),
        outline: Color(0xFF00E676),
        outlineVariant: Color(0xFF333333),
        shadow: Color(0xFF00E676),
        scrim: Color(0xFF000000),
      ),
      
      scaffoldBackgroundColor: const Color(0xFF000000),
      
      // Futuristic AppBar Theme
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w900,
          color: Colors.white,
          letterSpacing: 1.5,
          shadows: [
            Shadow(
              offset: Offset(0, 0),
              blurRadius: 10,
              color: Color(0xFF00E676),
            ),
          ],
        ),
      ),
      
      // Glassmorphism Card Theme
      cardTheme: CardThemeData(
        elevation: 0,
        color: const Color(0xFF1A1A1A).withOpacity(0.6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: BorderSide(
            color: const Color(0xFF00E676).withOpacity(0.2),
            width: 1.5,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        shadowColor: const Color(0xFF00E676).withOpacity(0.3),
      ),
      
      // Futuristic Input Decoration
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1A1A1A).withOpacity(0.7),
        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: BorderSide(
            color: const Color(0xFF00E676).withOpacity(0.3),
            width: 1.5,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: BorderSide(
            color: const Color(0xFF00E676).withOpacity(0.3),
            width: 1.5,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(
            color: Color(0xFF00E676),
            width: 2.5,
          ),
        ),
        labelStyle: const TextStyle(
          color: Color(0xFF00E676),
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        hintStyle: TextStyle(
          color: Colors.white.withOpacity(0.5),
          fontSize: 14,
        ),
        prefixIconColor: const Color(0xFF00E676),
        suffixIconColor: const Color(0xFF00E676),
      ),
      
      // Futuristic Button Themes
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF00E676),
          foregroundColor: Colors.black,
          elevation: 12,
          shadowColor: const Color(0xFF00E676).withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
        ),
      ),
      
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF00E676),
          side: const BorderSide(
            color: Color(0xFF00E676),
            width: 2,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.1,
          ),
        ),
      ),
      
      // Modern Text Theme
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: Colors.white,
          fontSize: 36,
          fontWeight: FontWeight.w900,
          letterSpacing: -1.0,
          shadows: [
            Shadow(
              offset: Offset(0, 0),
              blurRadius: 10,
              color: Color(0xFF00E676),
            ),
          ],
        ),
        displayMedium: TextStyle(
          color: Colors.white,
          fontSize: 30,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
        ),
        displaySmall: TextStyle(
          color: Colors.white,
          fontSize: 24,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.0,
        ),
        headlineLarge: TextStyle(
          color: Colors.white,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.25,
        ),
        headlineMedium: TextStyle(
          color: Colors.white,
          fontSize: 24,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.0,
        ),
        headlineSmall: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.15,
        ),
        titleLarge: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.15,
        ),
        titleMedium: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.1,
        ),
        titleSmall: TextStyle(
          color: Color(0xFF00E676),
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
        bodyLarge: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          letterSpacing: 0.5,
        ),
        bodyMedium: TextStyle(
          color: Color(0xFFE0E0E0),
          fontSize: 14,
          fontWeight: FontWeight.w400,
          letterSpacing: 0.25,
        ),
        bodySmall: TextStyle(
          color: Color(0xFFB0B0B0),
          fontSize: 12,
          fontWeight: FontWeight.w400,
          letterSpacing: 0.4,
        ),
        labelLarge: TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.25,
        ),
        labelMedium: TextStyle(
          color: Color(0xFF00E676),
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.5,
        ),
        labelSmall: TextStyle(
          color: Color(0xFFB0B0B0),
          fontSize: 10,
          fontWeight: FontWeight.w500,
          letterSpacing: 1.5,
        ),
      ),
      
      // Switch Theme for modern toggles
      switchTheme: SwitchThemeData(
        thumbColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) {
            return const Color(0xFF00E676);
          }
          return Colors.white;
        }),
        trackColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) {
            return const Color(0xFF00E676).withOpacity(0.3);
          }
          return Colors.grey.withOpacity(0.3);
        }),
      ),
      
      // BottomNavigationBar Theme
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF0F0F0F),
        selectedItemColor: Color(0xFF00E676),
        unselectedItemColor: Color(0xFF666666),
        selectedLabelStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w400,
        ),
        type: BottomNavigationBarType.fixed,
        elevation: 20,
      ),
      
      // Futuristic TabBar Theme
      tabBarTheme: const TabBarThemeData(
        indicator: UnderlineTabIndicator(
          borderSide: BorderSide(
            color: Color(0xFF00E676),
            width: 3,
          ),
          insets: EdgeInsets.symmetric(horizontal: 16),
        ),
        labelColor: Color(0xFF00E676),
        unselectedLabelColor: Color(0xFF666666),
        labelStyle: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      
      // Futuristic CheckBox Theme
      checkboxTheme: CheckboxThemeData(
        fillColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) {
            return const Color(0xFF00E676);
          }
          return Colors.transparent;
        }),
        checkColor: MaterialStateProperty.all(Colors.black),
        side: const BorderSide(
          color: Color(0xFF00E676),
          width: 2,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
        ),
      ),
      
      // Icon Theme
      iconTheme: const IconThemeData(
        color: Color(0xFF00E676),
        size: 24,
      ),
      
      // FloatingActionButton Theme
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: const Color(0xFF00E676),
        foregroundColor: Colors.black,
        elevation: 15,
        highlightElevation: 20,
        splashColor: Colors.white.withOpacity(0.3),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FruityTrack',
      theme: _buildModernTheme(),
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return Stack(
          children: [
            child!,
            StreamBuilder<NetworkStatus>(
              stream: Provider.of<NetworkService>(context).status,
              builder: (context, snapshot) {
                if (snapshot.data == NetworkStatus.offline) {
                  return Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Material(
                      child: Container(
                        color: Colors.red,
                        padding: const EdgeInsets.all(8),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.cloud_off, color: Colors.white),
                            SizedBox(width: 8),
                            Text(
                              'Vous êtes hors ligne',
                              style: TextStyle(color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        );
      },
      home: const AuthWrapper(),
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/admin/add-tree':
            return MaterialPageRoute(
              builder: (context) => const AdminAddTreeScreen(),
            );
          case '/admin/edit-tree':
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (context) => AdminEditTreeScreen(
                treeId: args['treeId'],
                initialData: args['tree'],
              ),
            );
          case '/tree-details':
            final String treeId = settings.arguments as String;
            return MaterialPageRoute(
              builder: (context) => TreeDetailsScreen(treeId: treeId),
            );
          case '/tree-analysis':
            return MaterialPageRoute(
              builder: (context) => const TreeAnalysisScreen(),
            );
        }
        return null;
      },
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    return FutureBuilder<bool>(
      future: authService.isAuthenticated(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final bool isAuthenticated = snapshot.data ?? false;
        if (isAuthenticated) {
          return const HomeScreen();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}
