import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChatService } from '../src/application/chat/ChatService.js';
import { UserPreference } from '../src/domain/user/UserPreference.js';
import { User } from '../src/domain/user/User.js';

function createChatService() {
  const user = new User({ id: 1, externalId: 'demo-user' });
  const preference = new UserPreference({ userId: user.id });

  return new ChatService({
    userRepository: {
      async findByExternalId() {
        return user;
      },
      async create() {
        return user;
      },
    },
    userPreferenceRepository: {
      async findByUserId() {
        return preference;
      },
      async createDefault() {
        return preference;
      },
    },
    chatSessionRepository: {
      async create({ userId, title }) {
        return { id: 10, userId, title };
      },
    },
    chatMessageRepository: {
      async create({ sessionId, userId, role, content }) {
        return { id: 20, sessionId, userId, role, content };
      },
    },
  });
}

describe('chat response', () => {
  it('returns an onboarding question for a valid message', async () => {
    const response = await createChatService().sendMessage({
      externalUserId: 'demo-user',
      message: '요즘 피곤해서 비타민을 보고 있어요',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.user_id, 'demo-user');
    assert.equal(response.body.session_id, 10);
    assert.equal(response.body.next_action, 'ASK_QUESTION');
    assert.match(response.body.message, /건강 고민/);
  });

  it('rejects an empty message', async () => {
    const response = await createChatService().sendMessage({
      externalUserId: 'demo-user',
      message: '',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error, 'message is required');
  });
});
