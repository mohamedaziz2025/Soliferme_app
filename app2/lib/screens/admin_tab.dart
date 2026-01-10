import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../widgets/glassmorphism_widgets.dart';
import 'admin_add_tree_screen.dart';
import 'admin_tree_management.dart';

class AdminTab extends StatefulWidget {
  const AdminTab({Key? key}) : super(key: key);

  @override
  _AdminTabState createState() => _AdminTabState();
}

class _AdminTabState extends State<AdminTab> with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  List<dynamic> _users = [];
  String _filterRole = 'all';
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadUsers();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadUsers() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final users = await authService.getAllUsers();
      setState(() {
        _users = users;
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

  List<Map<String, dynamic>> get _filteredUsers {
    return _users.where((user) {
      return _filterRole == 'all' || user['role'] == _filterRole;
    }).cast<Map<String, dynamic>>().toList();
  }

  Future<void> _navigateToAddTree() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AdminAddTreeScreen()),
    );

    if (result == true) {
      // Refresh the list if a tree was added
      _loadUsers();
    }
  }

  Future<void> _showAddUserDialog() async {
    final formKey = GlobalKey<FormState>();
    final emailController = TextEditingController();
    final nameController = TextEditingController();
    final passwordController = TextEditingController();
    String role = 'user';
    String language = 'fr';

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nouvel utilisateur'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: emailController,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un email';
                    }
                    return null;
                  },
                ),
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nom'),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un nom';
                    }
                    return null;
                  },
                ),
                TextFormField(
                  controller: passwordController,
                  decoration: const InputDecoration(labelText: 'Mot de passe'),
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un mot de passe';
                    }
                    return null;
                  },
                ),
                DropdownButtonFormField<String>(
                  value: role,
                  decoration: const InputDecoration(labelText: 'Rôle'),
                  items: const [
                    DropdownMenuItem(value: 'user', child: Text('Utilisateur')),
                    DropdownMenuItem(value: 'admin', child: Text('Administrateur')),
                  ],
                  onChanged: (value) => role = value!,
                ),
                DropdownButtonFormField<String>(
                  value: language,
                  decoration: const InputDecoration(labelText: 'Langue'),
                  items: const [
                    DropdownMenuItem(value: 'fr', child: Text('Français')),
                    DropdownMenuItem(value: 'en', child: Text('English')),
                    DropdownMenuItem(value: 'ar', child: Text('العربية')),
                  ],
                  onChanged: (value) => language = value!,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: Colors.white70,
            ),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState!.validate()) {
                try {
                  final authService = Provider.of<AuthService>(
                    context, 
                    listen: false,
                  );
                  await authService.createUser({
                    'email': emailController.text,
                    'name': nameController.text,
                    'password': passwordController.text,
                    'role': role,
                    'language': language,
                  });
                  if (mounted) {
                    Navigator.pop(context);
                    _loadUsers();
                  }
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E676),
              foregroundColor: Colors.black,
            ),
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
  }

  void _showEditRoleDialog(Map<String, dynamic> user) {
    String newRole = user['role'];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Modifier ${user['name']}'),
        content: DropdownButtonFormField<String>(
          value: newRole,
          items: const [
            DropdownMenuItem(value: 'user', child: Text('Utilisateur')),
            DropdownMenuItem(value: 'admin', child: Text('Administrateur')),
          ],
          onChanged: (value) => newRole = value!,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: Colors.white70,
            ),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final authService = Provider.of<AuthService>(
                  context, 
                  listen: false,
                );
                await authService.updateUserRole(user['_id'], newRole);
                if (mounted) {
                  Navigator.pop(context);
                  _loadUsers();
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Erreur: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E676),
              foregroundColor: Colors.black,
            ),
            child: const Text('Modifier'),
          ),
        ],
      ),
    );
  }

  Future<void> _showEditUserDialog(Map<String, dynamic> user) async {
    final formKey = GlobalKey<FormState>();
    final emailController = TextEditingController(text: user['email']);
    final nameController = TextEditingController(text: user['name']);
    final passwordController = TextEditingController();
    String role = user['role'];
    String language = user['language'] ?? 'fr';
    bool archived = user['archived'] ?? false;

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Modifier ${user['name']}'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: emailController,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Veuillez entrer un email';
                    return null;
                  },
                ),
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nom'),
                ),
                TextFormField(
                  controller: passwordController,
                  decoration: const InputDecoration(labelText: 'Nouveau mot de passe (laisser vide pour ne pas changer)'),
                  obscureText: true,
                ),
                DropdownButtonFormField<String>(
                  value: role,
                  decoration: const InputDecoration(labelText: 'Rôle'),
                  items: const [
                    DropdownMenuItem(value: 'user', child: Text('Utilisateur')),
                    DropdownMenuItem(value: 'admin', child: Text('Administrateur')),
                  ],
                  onChanged: (value) => role = value!,
                ),
                DropdownButtonFormField<String>(
                  value: language,
                  decoration: const InputDecoration(labelText: 'Langue'),
                  items: const [
                    DropdownMenuItem(value: 'fr', child: Text('Français')),
                    DropdownMenuItem(value: 'en', child: Text('English')),
                    DropdownMenuItem(value: 'ar', child: Text('العربية')),
                  ],
                  onChanged: (value) => language = value!,
                ),
                CheckboxListTile(
                  value: archived,
                  onChanged: (v) => archived = v ?? false,
                  title: const Text('Archivé'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(foregroundColor: Colors.white70),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState!.validate()) {
                try {
                  final authService = Provider.of<AuthService>(context, listen: false);
                  final updates = <String, dynamic>{
                    'email': emailController.text,
                    'name': nameController.text,
                    'role': role,
                    'language': language,
                    'archived': archived,
                  };
                  if (passwordController.text.isNotEmpty) updates['password'] = passwordController.text;

                  await authService.updateUserByAdmin(user['_id'], updates);
                  if (mounted) {
                    Navigator.pop(context);
                    _loadUsers();
                  }
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00E676), foregroundColor: Colors.black),
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Administration'),
          bottom: TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Utilisateurs'),
              Tab(text: 'Arbres'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildUsersTab(),
            const AdminTreeManagement(),
          ],
        ),
      ),
    );
  }

  Widget _buildUsersTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'all', label: Text('Tous')),
                  ButtonSegment(value: 'user', label: Text('Utilisateurs')),
                  ButtonSegment(value: 'admin', label: Text('Admins')),
                ],
                selected: {_filterRole},
                onSelectionChanged: (Set<String> selection) {
                  setState(() => _filterRole = selection.first);
                },
              ),
              IconButton(
                onPressed: _showAddUserDialog,
                icon: const Icon(Icons.add),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadUsers,
            color: const Color(0xFF00E676),
            child: ListView.builder(
              itemCount: _filteredUsers.length,
              itemBuilder: (context, index) {
                final user = _filteredUsers[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: GlassmorphismContainer(
                    child: ListTile(
                      title: Text(
                        user['name'],
                        style: const TextStyle(color: Colors.white),
                      ),
                      subtitle: Text(
                        user['email'],
                        style: TextStyle(color: Colors.white.withOpacity(0.7)),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: user['role'] == 'admin'
                                  ? const Color(0xFF00E676).withOpacity(0.2)
                                  : Colors.blue.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: user['role'] == 'admin'
                                    ? const Color(0xFF00E676)
                                    : Colors.blue,
                              ),
                            ),
                            child: Text(
                              user['role'] == 'admin' ? 'Admin' : 'Utilisateur',
                              style: TextStyle(
                                color: user['role'] == 'admin'
                                    ? const Color(0xFF00E676)
                                    : Colors.blue,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit, color: Colors.white),
                            onPressed: () => _showEditUserDialog(user),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}