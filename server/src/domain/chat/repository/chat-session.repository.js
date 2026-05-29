import { ChatSession } from '../entity/chat-session.entity.js';

function toChatSession(row) {
  if (!row) return null;

  return new ChatSession({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class ChatSessionRepository {
  constructor(db) {
    this.db = db;
  }

  async findByIdForUser({ id, userId }) {
    const [rows] = await this.db.execute(
      `SELECT id, user_id, title, created_at, updated_at
       FROM chat_sessions
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId],
    );

    return toChatSession(rows[0]);
  }

  async create({ userId, title = null }) {
    const [result] = await this.db.execute(
      `INSERT INTO chat_sessions (user_id, title)
       VALUES (?, ?)`,
      [userId, title],
    );

    return new ChatSession({
      id: result.insertId,
      userId,
      title,
    });
  }
}
