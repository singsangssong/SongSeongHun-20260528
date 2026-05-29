export class ChatMessageResponse {
  static from(message) {
    return {
      id: message.id,
      session_id: message.sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? {},
      created_at: message.createdAt,
    };
  }
}

export class ChatSessionResponse {
  static from(session) {
    return {
      id: session.id,
      title: session.title,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    };
  }
}

export class ChatTurnResponse {
  static from({
    user,
    session,
    preference,
    assistantMessage,
    nextAction,
    retrievedDocuments = [],
    recommendations = [],
  }) {
    return {
      user_id: user.externalId,
      session_id: session.id,
      is_onboarding_completed: preference.isOnboardingCompleted,
      next_action: nextAction,
      message: assistantMessage,
      retrieved_document_ids: retrievedDocuments.map((document) => document.id),
      recommendations,
    };
  }
}
