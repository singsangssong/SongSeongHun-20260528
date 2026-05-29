import { onboardingQuestions } from '../onboarding.questions.js';

const healthConcernKeywords = [
  ['피로', ['피로', '피곤', '기운', '활력']],
  ['수면', ['수면', '잠', '불면']],
  ['눈 건강', ['눈', '시력', '루테인']],
  ['갱년기', ['갱년기']],
  ['장 건강', ['장', '유산균', '변비', '소화']],
  ['면역', ['면역', '감기']],
  ['관절', ['관절', '무릎']],
  ['피부', ['피부']],
];

const goalKeywords = [
  ['피로 회복', ['피로 회복', '활력', '에너지']],
  ['수면 개선', ['수면 개선', '잠', '불면']],
  ['눈 건강 관리', ['눈', '시력', '루테인']],
  ['장 건강 관리', ['장', '유산균', '변비', '소화']],
  ['면역 관리', ['면역']],
];

const chronicConditionKeywords = [
  ['갑상선 질환', ['갑상선']],
  ['고혈압', ['고혈압', '혈압']],
  ['당뇨', ['당뇨', '혈당']],
  ['위장 질환', ['위장', '위염', '역류성']],
  ['간 질환', ['간 질환', '간수치']],
];

const medicationKeywords = [
  ['혈압약', ['혈압약']],
  ['당뇨약', ['당뇨약', '혈당약']],
  ['갑상선약', ['갑상선약']],
  ['피임약', ['피임약']],
  ['진통제', ['진통제']],
  ['항응고제', ['항응고제', '와파린']],
];

const supplementKeywords = [
  ['종합비타민', ['종합비타민', '멀티비타민']],
  ['오메가3', ['오메가3', '오메가-3']],
  ['유산균', ['유산균', '프로바이오틱스']],
  ['마그네슘', ['마그네슘']],
  ['비타민 D', ['비타민d', '비타민 D']],
];

const lifestylePatternKeywords = [
  ['수면 부족', ['수면 부족', '잠이 부족', '잠을 잘 못', '자주 깨']],
  ['야근/돌봄 부담', ['야근', '돌봄', '육아']],
  ['운동 부족', ['운동 부족', '운동을 못', '운동 거의']],
  ['외식/배달 잦음', ['외식', '배달']],
  ['앉아있는 시간 많음', ['앉아', '사무직']],
];

const avoidIngredientKeywords = [
  ['카페인', ['카페인']],
  ['유당', ['유당', '락토스']],
  ['철분', ['철분']],
  ['오메가3', ['오메가3', '오메가-3']],
  ['알레르기 유발 성분', ['알러지', '알레르기']],
];

const preferredFormatKeywords = [
  ['구미', ['구미', '젤리']],
  ['알약', ['알약', '정제']],
  ['캡슐', ['캡슐']],
  ['분말', ['분말', '가루']],
  ['액상', ['액상', '드링크']],
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergeUnique(existing, incoming) {
  return unique([...(existing ?? []), ...(incoming ?? [])]);
}

function findKeywordMatches(message, dictionary) {
  return dictionary
    .filter(([, keywords]) => keywords.some((keyword) => message.includes(keyword)))
    .map(([value]) => value);
}

function findPreferredFormats(message) {
  return preferredFormatKeywords
    .filter(([value, keywords]) => {
      const isComparedAgainst = message.includes(`${value}보다`);
      return (
        !isComparedAgainst &&
        keywords.some((keyword) => message.includes(keyword))
      );
    })
    .map(([value]) => value);
}

function parseAgeGroup(message) {
  const match = message.match(/([2-7]0)대/);
  return match ? `${match[1]}s` : null;
}

function parseGender(message) {
  if (/(여성|여자|엄마|어머니|아내)/.test(message)) return 'female';
  if (/(남성|남자|아빠|아버지|남편)/.test(message)) return 'male';
  return null;
}

function parsePregnancyStatus(message) {
  if (/(임신.*아니|임신.*없|수유.*아니|해당 없음|해당없음)/.test(message)) {
    return 'not_pregnant';
  }
  if (/임신 준비/.test(message)) return 'planning';
  if (/수유/.test(message)) return 'breastfeeding';
  if (/임신/.test(message)) return 'pregnant';
  return null;
}

export class OnboardingService {
  handleAnswer({ preference, message }) {
    const normalizedMessage = message.trim();
    const step = preference.onboardingStep ?? 0;

    if (step <= 0) return this.handleProfileAndConcernStep(preference, normalizedMessage);
    if (step === 1) return this.handleSafetyStep(preference, normalizedMessage);
    if (step === 2) return this.handleMedicationStep(preference, normalizedMessage);
    return this.handleLifestyleStep(preference, normalizedMessage);
  }

  handleProfileAndConcernStep(preference, message) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message);
    const ageGroup = parseAgeGroup(message) ?? preference.ageGroup;
    const gender = parseGender(message) ?? preference.gender;
    const healthConcerns = mergeUnique(
      preference.healthConcerns,
      findKeywordMatches(message, healthConcernKeywords),
    );
    const goals = mergeUnique(preference.goals, findKeywordMatches(message, goalKeywords));

    if (!ageGroup || healthConcerns.length === 0) {
      const hasSavedSafetyContext = patch.safetyNotes.length > (preference.safetyNotes ?? []).length;
      return this.reask({
        patch: { ...patch, ageGroup, gender, healthConcerns, goals, onboardingStep: 0 },
        message: hasSavedSafetyContext
          ? `말씀해주신 질환/복용 관련 정보는 저장했어요. ${onboardingQuestions.healthConcern}`
          : onboardingQuestions.healthConcern,
      });
    }

    return {
      preferencePatch: {
        ...patch,
        ageGroup,
        gender,
        healthConcerns,
        goals,
        onboardingStep: 1,
        isOnboardingCompleted: false,
      },
      nextAction: 'ASK_QUESTION',
      assistantMessage: onboardingQuestions.safety,
    };
  }

  handleSafetyStep(preference, message) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message);
    const pregnancyStatus = parsePregnancyStatus(message) ?? preference.pregnancyStatus;
    const chronicConditions = mergeUnique(
      preference.chronicConditions,
      findKeywordMatches(message, chronicConditionKeywords),
    );
    const hasNoCondition = /(질환.*없|지병.*없|없어요|없습니다|해당 없음|해당없음)/.test(message);

    if (!pregnancyStatus && chronicConditions.length === 0 && !hasNoCondition) {
      return this.reask({
        patch: { ...patch, onboardingStep: 1 },
        message: onboardingQuestions.safety,
      });
    }

    return {
      preferencePatch: {
        ...patch,
        pregnancyStatus,
        chronicConditions,
        onboardingStep: 2,
        isOnboardingCompleted: false,
      },
      nextAction: 'ASK_QUESTION',
      assistantMessage: onboardingQuestions.medication,
    };
  }

  handleMedicationStep(preference, message) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message);
    const medications = mergeUnique(
      preference.medications,
      findKeywordMatches(message, medicationKeywords),
    );
    const currentSupplements = mergeUnique(
      preference.currentSupplements,
      findKeywordMatches(message, supplementKeywords),
    );
    const hasNone = /(복용.*없|먹는.*없|없어요|없습니다|해당 없음|해당없음)/.test(message);

    if (medications.length === 0 && currentSupplements.length === 0 && !hasNone) {
      return this.reask({
        patch: { ...patch, onboardingStep: 2 },
        message: onboardingQuestions.medication,
      });
    }

    return {
      preferencePatch: {
        ...patch,
        medications,
        currentSupplements,
        onboardingStep: 3,
        isOnboardingCompleted: false,
      },
      nextAction: 'ASK_QUESTION',
      assistantMessage: onboardingQuestions.lifestyle,
    };
  }

  handleLifestyleStep(preference, message) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message);
    const lifestylePatterns = mergeUnique(
      preference.lifestylePatterns,
      findKeywordMatches(message, lifestylePatternKeywords),
    );
    const avoidIngredients = mergeUnique(
      preference.avoidIngredients,
      findKeywordMatches(message, avoidIngredientKeywords),
    );
    const preferredFormats = mergeUnique(
      preference.preferredFormats,
      findPreferredFormats(message),
    );

    if (
      lifestylePatterns.length === 0 &&
      avoidIngredients.length === 0 &&
      preferredFormats.length === 0
    ) {
      return this.reask({
        patch: { ...patch, onboardingStep: 3 },
        message: onboardingQuestions.lifestyle,
      });
    }

    return {
      preferencePatch: {
        ...patch,
        lifestylePatterns,
        avoidIngredients,
        preferredFormats,
        onboardingStep: 4,
        isOnboardingCompleted: true,
      },
      nextAction: 'SEARCH_RAG',
      assistantMessage: onboardingQuestions.completed,
    };
  }

  reask({ patch, message }) {
    return {
      preferencePatch: {
        ...patch,
        isOnboardingCompleted: false,
      },
      nextAction: 'ASK_QUESTION',
      assistantMessage: message,
    };
  }

  mergeSafetyNotes(patch, message) {
    const safetyNotes = mergeUnique(patch.safetyNotes, [
      ...findKeywordMatches(message, medicationKeywords),
      ...findKeywordMatches(message, chronicConditionKeywords),
      parsePregnancyStatus(message),
    ]);

    return {
      ...patch,
      safetyNotes,
    };
  }

  toPatch(preference) {
    return {
      ageGroup: preference.ageGroup,
      gender: preference.gender,
      healthConcerns: preference.healthConcerns ?? [],
      goals: preference.goals ?? [],
      pregnancyStatus: preference.pregnancyStatus,
      chronicConditions: preference.chronicConditions ?? [],
      medications: preference.medications ?? [],
      currentSupplements: preference.currentSupplements ?? [],
      lifestylePatterns: preference.lifestylePatterns ?? [],
      safetyNotes: preference.safetyNotes ?? [],
      avoidIngredients: preference.avoidIngredients ?? [],
      preferredFormats: preference.preferredFormats ?? [],
      isOnboardingCompleted: preference.isOnboardingCompleted,
      onboardingStep: preference.onboardingStep ?? 0,
    };
  }
}
