import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { ChatMessageRepository } from '../src/infrastructure/db/repositories/ChatMessageRepository.js';
import { ChatSessionRepository } from '../src/infrastructure/db/repositories/ChatSessionRepository.js';
import { ProductChunkRepository } from '../src/infrastructure/db/repositories/ProductChunkRepository.js';
import { ProductRepository } from '../src/infrastructure/db/repositories/ProductRepository.js';
import { UserPreferenceRepository } from '../src/infrastructure/db/repositories/UserPreferenceRepository.js';
import { UserRepository } from '../src/infrastructure/db/repositories/UserRepository.js';

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
    assert.deepEqual(preference.preferredFormats, ['tablet']);
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
