import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChatMessage } from '../src/domain/chat/ChatMessage.js';
import { ChatSession } from '../src/domain/chat/ChatSession.js';
import { ProductChunk } from '../src/domain/product/ProductChunk.js';
import { Product } from '../src/domain/product/Product.js';
import { UserPreference } from '../src/domain/user/UserPreference.js';
import { User } from '../src/domain/user/User.js';

describe('domain entities', () => {
  it('creates a user with an external id', () => {
    const user = new User({ id: 1, externalId: 'demo-user' });

    assert.equal(user.id, 1);
    assert.equal(user.externalId, 'demo-user');
  });

  it('creates onboarding preferences with default progress', () => {
    const preference = new UserPreference({ userId: 1 });

    assert.equal(preference.userId, 1);
    assert.equal(preference.isOnboardingCompleted, false);
    assert.equal(preference.onboardingStep, 0);
    assert.deepEqual(preference.healthConcerns, []);
  });

  it('creates chat session and message entities', () => {
    const session = new ChatSession({ id: 10, userId: 1, title: 'Demo' });
    const message = new ChatMessage({
      id: 20,
      sessionId: session.id,
      userId: 1,
      role: 'user',
      content: '요즘 피곤해요',
    });

    assert.equal(session.userId, 1);
    assert.equal(message.sessionId, 10);
    assert.equal(message.role, 'user');
  });

  it('creates product and chunk entities for RAG', () => {
    const product = new Product({
      id: 100,
      name: '비타민 B 컴플렉스',
      brand: 'Demo Brand',
      category: 'supplement',
    });
    const chunk = new ProductChunk({
      id: 200,
      productId: product.id,
      chunkType: 'ingredient',
      content: '비타민 B군은 에너지 대사에 관여합니다.',
    });

    assert.equal(product.name, '비타민 B 컴플렉스');
    assert.equal(chunk.productId, 100);
    assert.equal(chunk.chunkType, 'ingredient');
  });
});
