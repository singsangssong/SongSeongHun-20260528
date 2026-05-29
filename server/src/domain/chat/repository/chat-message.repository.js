import { stringifyJsonField } from '../../../global/db/json.js';
import { ChatMessage } from '../entity/chat-message.entity.js';

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
}
