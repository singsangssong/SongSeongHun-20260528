import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChatService } from '../src/application/chat/ChatService.js';
import { ChatMessage } from '../src/domain/chat/ChatMessage.js';
import { ChatSession } from '../src/domain/chat/ChatSession.js';
import { UserPreference } from '../src/domain/user/UserPreference.js';
import { User } from '../src/domain/user/User.js';

function createRepositories() {
  const calls = [];

  return {
    calls,
    userRepository: {
      async findByExternalId(externalId) {
        calls.push(['findUser', externalId]);
        return null;
      },
      async create({ externalId }) {
        calls.push(['createUser', externalId]);
        return new User({ id: 1, externalId });
      },
    },
    userPreferenceRepository: {
      async findByUserId(userId) {
        calls.push(['findPreference', userId]);
        return null;
      },
      async createDefault({ userId }) {
        calls.push(['createPreference', userId]);
        return new UserPreference({ id: 2, userId });
      },
    },
    chatSessionRepository: {
      async create({ userId, title }) {
        calls.push(['createSession', userId, title]);
        return new ChatSession({ id: 3, userId, title });
      },
    },
    chatMessageRepository: {
      async create({ sessionId, userId, role, content }) {
        calls.push(['createMessage', sessionId, userId, role, content]);
        return new ChatMessage({ id: calls.length, sessionId, userId, role, content });
      },
    },
  };
}

describe('ChatService', () => {
  it('persists a first chat turn for a new user', async () => {
    const repositories = createRepositories();
    const service = new ChatService(repositories);

    const result = await service.sendMessage({
      externalUserId: 'demo-user',
      message: '요즘 피곤해요',
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.user_id, 'demo-user');
    assert.equal(result.body.session_id, 3);
    assert.equal(result.body.is_onboarding_completed, false);
    assert.equal(result.body.next_action, 'ASK_QUESTION');
    assert.match(result.body.message, /건강 고민/);

    assert.deepEqual(repositories.calls.map(([name]) => name), [
      'findUser',
      'createUser',
      'findPreference',
      'createPreference',
      'createSession',
      'createMessage',
      'createMessage',
    ]);
  });

  it('rejects an empty message before persistence', async () => {
    const repositories = createRepositories();
    const service = new ChatService(repositories);

    const result = await service.sendMessage({
      externalUserId: 'demo-user',
      message: '',
    });

    assert.equal(result.statusCode, 400);
    assert.equal(result.body.error, 'message is required');
    assert.deepEqual(repositories.calls, []);
  });
});
