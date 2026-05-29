import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { ChatMessageRepository } from '../src/domain/chat/repository/chat-message.repository.js';
import { ChatSessionRepository } from '../src/domain/chat/repository/chat-session.repository.js';
import { ProductChunkRepository } from '../src/domain/product/repository/product-chunk.repository.js';
import { ProductRepository } from '../src/domain/product/repository/product.repository.js';
import { UserPreferenceRepository } from '../src/domain/user/repository/user-preference.repository.js';
import { UserRepository } from '../src/domain/user/repository/user.repository.js';

class FakeDb {
  constructor(results = []) {
    this.results = results;
    this.calls = [];
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    return this.results.shift() ?? [[], []];
  }
}

describe('repositories', () => {
  let db;

  beforeEach(() => {
    db = new FakeDb();
  });

  it('finds a user by external id', async () => {
    db.results.push([
      [
        {
          id: 1,
          external_id: 'demo-user',
          created_at: null,
          updated_at: null,
        },
      ],
      [],
    ]);

    const repository = new UserRepository(db);
    const user = await repository.findByExternalId('demo-user');

    assert.equal(user.externalId, 'demo-user');
    assert.match(db.calls[0].sql, /FROM users/);
    assert.deepEqual(db.calls[0].params, ['demo-user']);
  });

  it('creates a user when external id is missing', async () => {
    db.results.push([{ insertId: 7 }, []]);

    const repository = new UserRepository(db);
    const user = await repository.create({ externalId: 'new-user' });

    assert.equal(user.id, 7);
    assert.equal(user.externalId, 'new-user');
    assert.match(db.calls[0].sql, /INSERT INTO users/);
  });

  it('maps user preference JSON fields', async () => {
    db.results.push([
      [
        {
          id: 3,
          user_id: 1,
          age_group: '40s',
          gender: 'female',
          health_concerns: '["fatigue"]',
          goals: '["energy"]',
          pregnancy_status: 'not_pregnant',
          chronic_conditions: '["thyroid"]',
          medications: '["thyroid medicine"]',
          current_supplements: '["probiotics"]',
          lifestyle_patterns: '["sleep deprived"]',
          safety_notes: '["check medication interaction"]',
          avoid_ingredients: '[]',
          preferred_formats: '["tablet"]',
          is_onboarding_completed: 1,
          onboarding_step: 4,
          created_at: null,
          updated_at: null,
        },
      ],
      [],
    ]);

    const repository = new UserPreferenceRepository(db);
    const preference = await repository.findByUserId(1);

    assert.equal(preference.isOnboardingCompleted, true);
    assert.deepEqual(preference.healthConcerns, ['fatigue']);
    assert.equal(preference.pregnancyStatus, 'not_pregnant');
    assert.deepEqual(preference.medications, ['thyroid medicine']);
    assert.deepEqual(preference.safetyNotes, ['check medication interaction']);
    assert.deepEqual(preference.preferredFormats, ['tablet']);
  });

  it('updates onboarding progress for a user preference', async () => {
    db.results.push([{ affectedRows: 1 }, []]);
    db.results.push([
      [
        {
          id: 3,
          user_id: 1,
          age_group: '40s',
          gender: 'female',
          health_concerns: '["피로"]',
          goals: '["피로 회복"]',
          pregnancy_status: 'not_pregnant',
          chronic_conditions: '["갑상선 질환"]',
          medications: '["갑상선약"]',
          current_supplements: '["유산균"]',
          lifestyle_patterns: '["수면 부족"]',
          safety_notes: '["갑상선약"]',
          avoid_ingredients: '["카페인"]',
          preferred_formats: '["구미"]',
          is_onboarding_completed: 1,
          onboarding_step: 4,
          created_at: null,
          updated_at: null,
        },
      ],
      [],
    ]);

    const repository = new UserPreferenceRepository(db);
    const preference = await repository.updateOnboarding({
      userId: 1,
      patch: {
        ageGroup: '40s',
        gender: 'female',
        healthConcerns: ['피로'],
        goals: ['피로 회복'],
        pregnancyStatus: 'not_pregnant',
        chronicConditions: ['갑상선 질환'],
        medications: ['갑상선약'],
        currentSupplements: ['유산균'],
        lifestylePatterns: ['수면 부족'],
        safetyNotes: ['갑상선약'],
        avoidIngredients: ['카페인'],
        preferredFormats: ['구미'],
        isOnboardingCompleted: true,
        onboardingStep: 4,
      },
    });

    assert.equal(preference.isOnboardingCompleted, true);
    assert.deepEqual(preference.medications, ['갑상선약']);
    assert.deepEqual(preference.avoidIngredients, ['카페인']);
    assert.match(db.calls[0].sql, /UPDATE user_preferences/);
  });

  it('finds a chat session by id and user id', async () => {
    db.results.push([
      [
        {
          id: 11,
          user_id: 1,
          title: 'Existing',
          created_at: null,
          updated_at: null,
        },
      ],
      [],
    ]);

    const repository = new ChatSessionRepository(db);
    const session = await repository.findByIdForUser({ id: 11, userId: 1 });

    assert.equal(session.id, 11);
    assert.equal(session.userId, 1);
    assert.match(db.calls[0].sql, /FROM chat_sessions/);
    assert.deepEqual(db.calls[0].params, [11, 1]);
  });

  it('creates chat sessions and messages', async () => {
    db.results.push([{ insertId: 11 }, []], [{ insertId: 12 }, []]);

    const sessionRepository = new ChatSessionRepository(db);
    const messageRepository = new ChatMessageRepository(db);

    const session = await sessionRepository.create({ userId: 1, title: 'Demo' });
    const message = await messageRepository.create({
      sessionId: session.id,
      userId: 1,
      role: 'user',
      content: '요즘 피곤해요',
    });

    assert.equal(session.id, 11);
    assert.equal(message.id, 12);
    assert.match(db.calls[0].sql, /INSERT INTO chat_sessions/);
    assert.match(db.calls[1].sql, /INSERT INTO chat_messages/);
  });

  it('creates products and chunks', async () => {
    db.results.push([{ insertId: 21 }, []], [{ insertId: 22 }, []]);

    const productRepository = new ProductRepository(db);
    const chunkRepository = new ProductChunkRepository(db);

    const product = await productRepository.create({
      name: '비타민 B 컴플렉스',
      brand: 'Demo Brand',
      category: 'supplement',
    });
    const chunk = await chunkRepository.create({
      productId: product.id,
      chunkType: 'ingredient',
      content: '비타민 B군은 에너지 대사에 관여합니다.',
    });

    assert.equal(product.id, 21);
    assert.equal(chunk.id, 22);
    assert.match(db.calls[0].sql, /INSERT INTO products/);
    assert.match(db.calls[1].sql, /INSERT INTO product_chunks/);
  });
});
