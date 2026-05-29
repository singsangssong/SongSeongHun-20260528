import { createDatabasePool } from './database.js';
import { ChatMessageRepository } from '../../domain/chat/repository/chat-message.repository.js';
import { ChatSessionRepository } from '../../domain/chat/repository/chat-session.repository.js';
import { UserPreferenceRepository } from '../../domain/user/repository/user-preference.repository.js';
import { UserRepository } from '../../domain/user/repository/user.repository.js';

export function createRepositories(db = createDatabasePool()) {
  return {
    db,
    userRepository: new UserRepository(db),
    userPreferenceRepository: new UserPreferenceRepository(db),
    chatSessionRepository: new ChatSessionRepository(db),
    chatMessageRepository: new ChatMessageRepository(db),
  };
}
