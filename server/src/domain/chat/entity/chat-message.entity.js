const allowedRoles = new Set(['user', 'assistant', 'system', 'tool']);

export class ChatMessage {
  constructor({
    id = null,
    sessionId,
    userId,
    role,
    content,
    metadata = {},
    createdAt = null,
  }) {
    if (!sessionId) {
      throw new Error('ChatMessage.sessionId is required');
    }

    if (!userId) {
      throw new Error('ChatMessage.userId is required');
    }

    if (!allowedRoles.has(role)) {
      throw new Error('ChatMessage.role is invalid');
    }

    if (!content) {
      throw new Error('ChatMessage.content is required');
    }

    this.id = id;
    this.sessionId = sessionId;
    this.userId = userId;
    this.role = role;
    this.content = content;
    this.metadata = metadata;
    this.createdAt = createdAt;
  }
}

