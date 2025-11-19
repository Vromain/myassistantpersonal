import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/message.dart';

/// Database Helper
/// Task: T030 - Implement SQLite caching in message_repository.dart
/// Provides local SQLite database for offline message caching

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._internal();
  static Database? _database;

  DatabaseHelper._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'communication_hub.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Messages table
    await db.execute('''
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        platform_message_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        preview TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        read_status INTEGER NOT NULL,
        is_urgent INTEGER NOT NULL,
        priority_level TEXT NOT NULL,
        priority_score REAL NOT NULL,
        priority_reasoning TEXT,
        category_id TEXT,
        has_attachments INTEGER NOT NULL,
        attachments_json TEXT,
        metadata_json TEXT,
        synced_at INTEGER NOT NULL,
        UNIQUE(platform, platform_message_id)
      )
    ''');

    // Indexes for common queries
    await db.execute('''
      CREATE INDEX idx_messages_timestamp
      ON messages(timestamp DESC)
    ''');

    await db.execute('''
      CREATE INDEX idx_messages_read_status
      ON messages(read_status)
    ''');

    await db.execute('''
      CREATE INDEX idx_messages_priority
      ON messages(priority_score DESC)
    ''');

    await db.execute('''
      CREATE INDEX idx_messages_category
      ON messages(category_id)
    ''');

    await db.execute('''
      CREATE INDEX idx_messages_platform
      ON messages(platform)
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle database migrations here in future versions
  }

  /// Cache a single message
  Future<void> cacheMessage(Message message) async {
    final db = await database;

    await db.insert(
      'messages',
      _messageToMap(message),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Cache multiple messages
  Future<void> cacheMessages(List<Message> messages) async {
    final db = await database;
    final batch = db.batch();

    for (final message in messages) {
      batch.insert(
        'messages',
        _messageToMap(message),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit(noResult: true);
  }

  /// Get cached messages with filters
  Future<List<Message>> getCachedMessages({
    int limit = 50,
    int offset = 0,
    List<Platform>? platforms,
    PriorityLevel? priority,
    bool? readStatus,
    bool? urgent,
    String? categoryId,
    String sortBy = 'timestamp',
    String sortOrder = 'desc',
  }) async {
    final db = await database;
    final where = <String>[];
    final whereArgs = <dynamic>[];

    if (platforms != null && platforms.isNotEmpty) {
      where.add('platform IN (${platforms.map((_) => '?').join(', ')})');
      whereArgs.addAll(platforms.map((p) => p.name));
    }

    if (priority != null) {
      where.add('priority_level = ?');
      whereArgs.add(priority.name);
    }

    if (readStatus != null) {
      where.add('read_status = ?');
      whereArgs.add(readStatus ? 1 : 0);
    }

    if (urgent != null) {
      where.add('is_urgent = ?');
      whereArgs.add(urgent ? 1 : 0);
    }

    if (categoryId != null) {
      where.add('category_id = ?');
      whereArgs.add(categoryId);
    }

    final orderByColumn = sortBy == 'priorityScore' ? 'priority_score' : sortBy;
    final orderBy = '$orderByColumn $sortOrder';

    final results = await db.query(
      'messages',
      where: where.isNotEmpty ? where.join(' AND ') : null,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: orderBy,
      limit: limit,
      offset: offset,
    );

    return results.map((map) => _messageFromMap(map)).toList();
  }

  /// Get single cached message by ID
  Future<Message?> getCachedMessage(String id) async {
    final db = await database;

    final results = await db.query(
      'messages',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );

    if (results.isEmpty) return null;
    return _messageFromMap(results.first);
  }

  /// Update message read status in cache
  Future<void> updateCachedReadStatus(String id, bool readStatus) async {
    final db = await database;

    await db.update(
      'messages',
      {'read_status': readStatus ? 1 : 0},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Update message category in cache
  Future<void> updateCachedCategory(String id, String? categoryId) async {
    final db = await database;

    await db.update(
      'messages',
      {'category_id': categoryId},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Delete message from cache
  Future<void> deleteCachedMessage(String id) async {
    final db = await database;

    await db.delete(
      'messages',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Get cached unread count
  Future<int> getCachedUnreadCount() async {
    final db = await database;

    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM messages WHERE read_status = 0',
    );

    return Sqflite.firstIntValue(result) ?? 0;
  }

  /// Clear all cached messages
  Future<void> clearCache() async {
    final db = await database;
    await db.delete('messages');
  }

  /// Clear old cached messages (older than specified days)
  Future<void> clearOldCache({int daysToKeep = 30}) async {
    final db = await database;
    final cutoffTimestamp =
        DateTime.now().subtract(Duration(days: daysToKeep)).millisecondsSinceEpoch;

    await db.delete(
      'messages',
      where: 'timestamp < ?',
      whereArgs: [cutoffTimestamp],
    );
  }

  /// Convert Message to Map for database
  Map<String, dynamic> _messageToMap(Message message) {
    return {
      'id': message.id,
      'account_id': message.accountId,
      'external_id': message.externalId,
      'platform': message.platform.name,
      'sender': message.sender,
      'recipient': message.recipient,
      'subject': message.subject,
      'content': message.content,
      'preview': message.preview,
      'timestamp': message.timestamp.millisecondsSinceEpoch,
      'read_status': message.readStatus ? 1 : 0,
      'is_urgent': message.isUrgent ? 1 : 0,
      'priority_level': message.priorityLevel.name,
      'priority_score': message.priorityScore,
      'category_id': message.categoryId,
      'has_attachments': message.hasAttachments ? 1 : 0,
      'attachments_json':
          message.attachments.isNotEmpty ? _encodeAttachments(message.attachments) : null,
      'metadata_json': message.metadata != null && message.metadata!.isNotEmpty ? _encodeMetadata(message.metadata!) : null,
      'archived_at': message.archivedAt?.millisecondsSinceEpoch,
      'synced_at': DateTime.now().millisecondsSinceEpoch,
    };
  }

  /// Convert Map from database to Message
  Message _messageFromMap(Map<String, dynamic> map) {
    return Message(
      id: map['id'] as String,
      accountId: map['account_id'] as String,
      externalId: map['external_id'] as String,
      platform: Platform.values.firstWhere(
        (p) => p.name == map['platform'],
        orElse: () => Platform.gmail,
      ),
      sender: map['sender'] as String,
      recipient: map['recipient'] as String,
      subject: map['subject'] as String?,
      content: map['content'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int),
      readStatus: (map['read_status'] as int) == 1,
      isUrgent: (map['is_urgent'] as int) == 1,
      priorityLevel: PriorityLevel.values.firstWhere(
        (p) => p.name == map['priority_level'],
        orElse: () => PriorityLevel.medium,
      ),
      priorityScore: map['priority_score'] as int? ?? 50,
      categoryId: map['category_id'] as String?,
      attachments: map['attachments_json'] != null
          ? _decodeAttachments(map['attachments_json'] as String)
          : [],
      metadata: map['metadata_json'] != null
          ? _decodeMetadata(map['metadata_json'] as String)
          : null,
      archivedAt: map['archived_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['archived_at'] as int)
          : null,
    );
  }

  /// Encode attachments to JSON string
  String _encodeAttachments(List<Attachment> attachments) {
    return attachments
        .map((a) => '${a.filename}|${a.mimeType}|${a.size}|${a.url ?? ""}')
        .join(';;');
  }

  /// Decode attachments from JSON string
  List<Attachment> _decodeAttachments(String json) {
    if (json.isEmpty) return [];
    return json.split(';;').where((str) => str.isNotEmpty).map((str) {
      final parts = str.split('|');
      return Attachment(
        filename: parts[0],
        mimeType: parts[1],
        size: int.parse(parts[2]),
        url: parts.length > 3 && parts[3].isNotEmpty ? parts[3] : null,
      );
    }).toList();
  }

  /// Encode metadata to JSON string
  String _encodeMetadata(Map<String, dynamic> metadata) {
    return metadata.entries.map((e) => '${e.key}=${e.value}').join(';;');
  }

  /// Decode metadata from JSON string
  Map<String, dynamic> _decodeMetadata(String json) {
    final map = <String, dynamic>{};
    for (final entry in json.split(';;')) {
      final parts = entry.split('=');
      if (parts.length == 2) {
        map[parts[0]] = parts[1];
      }
    }
    return map;
  }

  /// Close database
  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}
