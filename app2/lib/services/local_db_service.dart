import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Simple wrapper around a sqflite database that will eventually
/// replace SharedPreferences for offline storage and event sourcing.
///
/// This is intentionally minimal; further methods can be added as the
/// project grows.
class LocalDatabase {
  static final LocalDatabase instance = LocalDatabase._init();
  static Database? _database;

  LocalDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('fruitytrack.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);
    return await openDatabase(path, version: 1, onCreate: _createDB);
  }

  Future _createDB(Database db, int version) async {
    // table to store arbitrary events for sync
    await db.execute('''
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    ''');

    // example table for analysis results cached offline
    await db.execute('''
      CREATE TABLE analyses (
        treeId TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    ''');

    // you can add more tables (trees, users, etc.) as needed
  }

  Future<void> queueEvent(String id, String type, String payload) async {
    final db = await instance.database;
    await db.insert(
      'events',
      {
        'id': id,
        'type': type,
        'payload': payload,
        'timestamp': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getPendingEvents() async {
    final db = await instance.database;
    return await db.query('events', orderBy: 'timestamp ASC');
  }

  Future<void> deleteEvent(String id) async {
    final db = await instance.database;
    await db.delete('events', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> saveAnalysis(String treeId, String data) async {
    final db = await instance.database;
    await db.insert(
      'analyses',
      {
        'treeId': treeId,
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> getAnalysis(String treeId) async {
    final db = await instance.database;
    final results = await db.query('analyses', where: 'treeId = ?', whereArgs: [treeId]);
    if (results.isNotEmpty) {
      return results.first['data'] as String;
    }
    return null;
  }
}
