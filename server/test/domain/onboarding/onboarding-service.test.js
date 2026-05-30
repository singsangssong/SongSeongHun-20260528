import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OnboardingService } from '../../../src/domain/onboarding/service/onboarding.service.js';
import { UserPreference } from '../../../src/domain/user/entity/user-preference.entity.js';

describe('OnboardingService', () => {
  it('extracts age group and health concerns before asking safety context', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({ id: 1, userId: 1 }),
      message: '40대 여성이고 요즘 피로랑 수면이 고민이에요',
    });

    assert.equal(result.preferencePatch.ageGroup, '40s');
    assert.equal(result.preferencePatch.gender, 'female');
    assert.deepEqual(result.preferencePatch.healthConcerns, ['피로', '수면']);
    assert.equal(result.preferencePatch.onboardingStep, 1);
    assert.equal(result.nextAction, 'ASK_QUESTION');
    assert.match(result.assistantMessage, /임신/);
  });

  it('asks the same step again when the answer is not relevant', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({ id: 1, userId: 1 }),
      message: '그냥 아무거나 추천해줘',
    });

    assert.equal(result.preferencePatch.onboardingStep, 0);
    assert.equal(result.preferencePatch.isOnboardingCompleted, false);
    assert.match(result.assistantMessage, /확인하기 어려워요/);
    assert.match(result.assistantMessage, /연령대와 건강 고민/);
  });

  it('keeps safety context and explains what is still missing during profile step', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({ id: 1, userId: 1 }),
      message: '임신은 아니고 갑상선 질환으로 관리 중이에요',
    });

    assert.equal(result.preferencePatch.pregnancyStatus, null);
    assert.deepEqual(result.preferencePatch.safetyNotes, [
      '갑상선 질환',
      'not_pregnant',
    ]);
    assert.match(result.assistantMessage, /질환\/복용 관련 정보는 저장/);
    assert.match(result.assistantMessage, /연령대와 건강 고민/);
  });

  it('extracts pregnancy and chronic condition safety context', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({
        id: 1,
        userId: 1,
        ageGroup: '40s',
        gender: 'female',
        healthConcerns: ['피로'],
        onboardingStep: 1,
      }),
      message: '임신은 아니고 갑상선 질환으로 관리 중이에요',
    });

    assert.equal(result.preferencePatch.pregnancyStatus, 'not_pregnant');
    assert.deepEqual(result.preferencePatch.chronicConditions, ['갑상선 질환']);
    assert.equal(result.preferencePatch.onboardingStep, 2);
    assert.match(result.assistantMessage, /복용 중인 약/);
  });

  it('captures medication and supplement context', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({
        id: 1,
        userId: 1,
        ageGroup: '40s',
        gender: 'female',
        healthConcerns: ['피로'],
        pregnancyStatus: 'not_pregnant',
        chronicConditions: ['갑상선 질환'],
        onboardingStep: 2,
      }),
      message: '갑상선약을 먹고 있고 유산균도 먹어요',
    });

    assert.deepEqual(result.preferencePatch.medications, ['갑상선약']);
    assert.deepEqual(result.preferencePatch.currentSupplements, ['유산균']);
    assert.equal(result.preferencePatch.onboardingStep, 3);
    assert.match(result.assistantMessage, /생활패턴/);
  });

  it('completes onboarding after lifestyle and caution context are captured', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({
        id: 1,
        userId: 1,
        ageGroup: '40s',
        gender: 'female',
        healthConcerns: ['피로'],
        pregnancyStatus: 'not_pregnant',
        chronicConditions: ['갑상선 질환'],
        medications: ['갑상선약'],
        currentSupplements: ['유산균'],
        onboardingStep: 3,
      }),
      message: '수면 부족하고 야근이 많아요. 카페인은 피하고 구미가 좋아요',
    });

    assert.deepEqual(result.preferencePatch.lifestylePatterns, ['수면 부족', '야근/돌봄 부담']);
    assert.deepEqual(result.preferencePatch.avoidIngredients, ['카페인']);
    assert.deepEqual(result.preferencePatch.preferredFormats, ['구미']);
    assert.equal(result.preferencePatch.isOnboardingCompleted, true);
    assert.equal(result.preferencePatch.onboardingStep, 4);
    assert.equal(result.nextAction, 'SEARCH_RAG');
  });

  it('keeps safety notes even when safety context appears in a different step', () => {
    const service = new OnboardingService();
    const result = service.handleAnswer({
      preference: new UserPreference({ id: 1, userId: 1 }),
      message: '40대 여성이고 피로가 고민인데 혈압약을 먹고 있어요',
    });

    assert.deepEqual(result.preferencePatch.healthConcerns, ['피로']);
    assert.deepEqual(result.preferencePatch.medications, []);
    assert.deepEqual(result.preferencePatch.safetyNotes, ['혈압약', '고혈압']);
  });

  it('uses LLM extraction when natural language does not match local keywords', async () => {
    const service = new OnboardingService({
      extractionModel: {
        async extractOnboardingPreferences({ message, onboardingStep }) {
          assert.equal(onboardingStep, 0);
          assert.match(message, /아침에 일어나기가 힘들/);

          return {
            ageGroup: '40s',
            gender: 'female',
            healthConcerns: ['피로', '수면'],
            goals: ['피로 회복'],
          };
        },
      },
    });
    const result = await service.handleAnswer({
      preference: new UserPreference({ id: 1, userId: 1 }),
      message: '마흔 넘은 워킹맘인데 아침에 일어나기가 힘들고 밤에도 자주 깨요',
    });

    assert.equal(result.preferencePatch.ageGroup, '40s');
    assert.equal(result.preferencePatch.gender, 'female');
    assert.deepEqual(result.preferencePatch.healthConcerns, ['피로', '수면']);
    assert.deepEqual(result.preferencePatch.goals, ['피로 회복']);
    assert.equal(result.preferencePatch.onboardingStep, 1);
  });

  it('falls back to the local parser when LLM extraction fails', async () => {
    const service = new OnboardingService({
      extractionModel: {
        async extractOnboardingPreferences() {
          throw new Error('temporary LLM failure');
        },
      },
    });
    const result = await service.handleAnswer({
      preference: new UserPreference({ id: 1, userId: 1 }),
      message: '40대 여성이고 피로가 고민이에요',
    });

    assert.equal(result.preferencePatch.ageGroup, '40s');
    assert.deepEqual(result.preferencePatch.healthConcerns, ['피로']);
    assert.equal(result.preferencePatch.onboardingStep, 1);
  });
});
