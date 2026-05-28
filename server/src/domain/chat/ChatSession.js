export class ChatSession {
  constructor({ id = null, userId, title = null, createdAt = null, updatedAt = null }) {
    if (!userId) {
      throw new Error('ChatSession.userId is required');
    }

    this.id = id;
    this.userId = userId;
    this.title = title;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

