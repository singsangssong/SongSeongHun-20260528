import { createDatabasePool } from './database.js';
import {
  ChatMessageRepository,
  ChatSessionRepository,
  UserPreferenceRepository,
  UserRepository,
} from './repositories/index.js';

export function createRepositories(db = createDatabasePool()) {
  return {
    db,
    userRepository: new UserRepository(db),
    userPreferenceRepository: new UserPreferenceRepository(db),
    chatSessionRepository: new ChatSessionRepository(db),
    chatMessageRepository: new ChatMessageRepository(db),
  };
}

