import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChatMessage } from '../src/domain/chat/entity/chat-message.entity.js';
import { ChatSession } from '../src/domain/chat/entity/chat-session.entity.js';
import { ChatService } from '../src/domain/chat/service/chat.service.js';
import { UserPreference } from '../src/domain/user/entity/user-preference.entity.js';
import { User } from '../src/domain/user/entity/user.entity.js';

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
      async updateOnboarding({ userId, patch }) {
        calls.push(['updatePreference', userId, patch]);
        return new UserPreference({ id: 2, userId, ...patch });
      },
    },
    chatSessionRepository: {
      async findByIdForUser({ id, userId }) {
        calls.push(['findSession', id, userId]);
        return null;
      },
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
    assert.match(result.body.message, /연령대/);

    assert.deepEqual(repositories.calls.map(([name]) => name), [
      'findUser',
      'createUser',
      'findPreference',
      'createPreference',
      'createSession',
      'createMessage',
      'updatePreference',
      'createMessage',
    ]);
  });

  it('updates onboarding preferences and completes onboarding after the final answer', async () => {
    const repositories = createRepositories();
    repositories.userRepository.findByExternalId = async (externalId) => {
      repositories.calls.push(['findUser', externalId]);
      return new User({ id: 1, externalId });
    };
    repositories.userPreferenceRepository.findByUserId = async (userId) => {
      repositories.calls.push(['findPreference', userId]);
      return new UserPreference({
        id: 2,
        userId,
        ageGroup: '40s',
        gender: 'female',
        healthConcerns: ['피로'],
        goals: ['피로 회복'],
        pregnancyStatus: 'not_pregnant',
        chronicConditions: ['갑상선 질환'],
        medications: ['갑상선약'],
        currentSupplements: ['유산균'],
        onboardingStep: 3,
      });
    };

    const service = new ChatService(repositories);
    const result = await service.sendMessage({
      externalUserId: 'demo-user',
      message: '수면 부족하고 야근이 많아요. 카페인은 피하고 구미 형태가 좋아요',
      sessionId: 9,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.is_onboarding_completed, true);
    assert.equal(result.body.next_action, 'SEARCH_RAG');
    assert.match(result.body.message, /이제 추천/);

    const updateCall = repositories.calls.find(([name]) => name === 'updatePreference');
    assert.equal(updateCall[1], 1);
    assert.equal(updateCall[2].isOnboardingCompleted, true);
    assert.deepEqual(updateCall[2].lifestylePatterns, ['수면 부족', '야근/돌봄 부담']);
    assert.deepEqual(updateCall[2].avoidIngredients, ['카페인']);
    assert.deepEqual(updateCall[2].preferredFormats, ['구미']);
  });

  it('reuses a chat session when it belongs to the user', async () => {
    const repositories = createRepositories();
    repositories.chatSessionRepository.findByIdForUser = async ({ id, userId }) => {
      repositories.calls.push(['findSession', id, userId]);
      return new ChatSession({ id, userId, title: 'Existing' });
    };

    const service = new ChatService(repositories);
    const result = await service.sendMessage({
      externalUserId: 'demo-user',
      message: '피로가 고민이에요',
      sessionId: 44,
    });

    assert.equal(result.body.session_id, 44);
    assert.ok(!repositories.calls.some(([name]) => name === 'createSession'));
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

  it('uses RAG workflow when onboarding is completed', async () => {
    const repositories = createRepositories();
    repositories.userRepository.findByExternalId = async (externalId) => {
      repositories.calls.push(['findUser', externalId]);
      return new User({ id: 1, externalId });
    };
    repositories.userPreferenceRepository.findByUserId = async (userId) => {
      repositories.calls.push(['findPreference', userId]);
      return new UserPreference({
        id: 2,
        userId,
        healthConcerns: ['피로'],
        isOnboardingCompleted: true,
        onboardingStep: 3,
      });
    };

    const service = new ChatService({
      ...repositories,
      ragWorkflow: {
        async invoke({ message, userPreferences }) {
          return {
            nextAction: 'RESPOND',
            answer: `RAG answer: ${message} / ${userPreferences.healthConcerns[0]}`,
            retrievedDocuments: [{ id: 'vitamin-b-ingredient' }],
          };
        },
      },
    });

    const result = await service.sendMessage({
      externalUserId: 'demo-user',
      message: '피로에 좋은 영양제를 추천해줘',
    });

    assert.equal(result.body.next_action, 'RESPOND');
    assert.match(result.body.message, /RAG answer/);
    assert.deepEqual(result.body.retrieved_document_ids, ['vitamin-b-ingredient']);
  });
});
