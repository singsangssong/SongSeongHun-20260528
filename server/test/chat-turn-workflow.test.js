import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChatTurnWorkflow } from '../src/domain/chat/service/chat-turn.workflow.js';
import { UserPreference } from '../src/domain/user/entity/user-preference.entity.js';
import { User } from '../src/domain/user/entity/user.entity.js';

describe('ChatTurnWorkflow', () => {
  it('routes incomplete preferences to onboarding', async () => {
    const workflow = new ChatTurnWorkflow({
      onboardingService: {
        handleAnswer({ message }) {
          return {
            nextAction: 'ASK_QUESTION',
            assistantMessage: `onboarding: ${message}`,
            preferencePatch: {
              healthConcerns: ['피로'],
              onboardingStep: 0,
              isOnboardingCompleted: false,
            },
          };
        },
      },
      ragWorkflow: {
        async invoke() {
          throw new Error('RAG should not be called');
        },
      },
    });

    const result = await workflow.invoke({
      user: new User({ id: 1, externalId: 'demo-user' }),
      preference: new UserPreference({ id: 2, userId: 1 }),
      message: '피로가 고민이에요',
    });

    assert.equal(result.nextAction, 'ASK_QUESTION');
    assert.equal(result.assistantMessage, 'onboarding: 피로가 고민이에요');
    assert.deepEqual(result.preferencePatch.healthConcerns, ['피로']);
    assert.deepEqual(result.retrievedDocuments, []);
  });

  it('routes completed preferences to RAG', async () => {
    const workflow = new ChatTurnWorkflow({
      onboardingService: {
        handleAnswer() {
          throw new Error('onboarding should not be called');
        },
      },
      ragWorkflow: {
        async invoke({ userId, message, userPreferences }) {
          return {
            nextAction: 'RESPOND',
            answer: `${userId}: ${message} / ${userPreferences.healthConcerns[0]}`,
            retrievedDocuments: [{ id: 'vitamin-b-ingredient' }],
          };
        },
      },
    });

    const result = await workflow.invoke({
      user: new User({ id: 1, externalId: 'demo-user' }),
      preference: new UserPreference({
        id: 2,
        userId: 1,
        healthConcerns: ['피로'],
        isOnboardingCompleted: true,
        onboardingStep: 4,
      }),
      message: '피로에 좋은 영양제를 추천해줘',
    });

    assert.equal(result.nextAction, 'RESPOND');
    assert.match(result.assistantMessage, /demo-user/);
    assert.deepEqual(result.retrievedDocuments, [{ id: 'vitamin-b-ingredient' }]);
    assert.equal(result.preferencePatch, null);
  });
});
