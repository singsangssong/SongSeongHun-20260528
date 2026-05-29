import { parseJsonField, stringifyJsonField } from '../../../global/db/json.js';
import { ChatMessage } from '../entity/chat-message.entity.js';

function toChatMessage(row) {
  if (!row) return null;

  return new ChatMessage({
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    metadata: parseJsonField(row.metadata, {}),
    createdAt: row.created_at,
  });
}

export class ChatMessageRepository {
  constructor(db) {
    this.db = db;
  }

  async create({ sessionId, userId, role, content, metadata = {} }) {
    const [result] = await this.db.execute(
      `INSERT INTO chat_messages (session_id, user_id, role, content, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, userId, role, content, stringifyJsonField(metadata, {})],
    );

    return new ChatMessage({
      id: result.insertId,
      sessionId,
      userId,
      role,
      content,
      metadata,
    });
  }

  async findBySessionForUser({ sessionId, userId, limit = 100 }) {
    const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 100, 300));
    const [rows] = await this.db.execute(
      `SELECT id, session_id, user_id, role, content, metadata, created_at
       FROM chat_messages
       WHERE session_id = ? AND user_id = ?
       ORDER BY created_at ASC, id ASC
       LIMIT ${safeLimit}`,
      [sessionId, userId],
    );

    return rows.map(toChatMessage);
  }
}
