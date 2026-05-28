import { ChatSession } from '../../../domain/chat/ChatSession.js';

export class ChatSessionRepository {
  constructor(db) {
    this.db = db;
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

