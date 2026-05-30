import { onboardingQuestions } from '../onboarding.questions.js';
import { normalizeExtraction } from '../onboarding.extraction-normalizer.js';
import {
  avoidIngredientKeywords,
  chronicConditionKeywords,
  goalKeywords,
  healthConcernKeywords,
  lifestylePatternKeywords,
  medicationKeywords,
  supplementKeywords,
} from '../onboarding.keyword-dictionaries.js';
import {
  arrayOrEmpty,
  findKeywordMatches,
  findPreferredFormats,
  mergeUnique,
  parseAgeGroup,
  parseGender,
  parsePregnancyStatus,
} from '../onboarding.parser.js';

export class OnboardingService {
  constructor({ extractionModel = null } = {}) {
    this.extractionModel = extractionModel;
  }

  handleAnswer({ preference, message }) {
    const normalizedMessage = message.trim();

    if (this.extractionModel) {
      return this.handleAnswerWithModel({
        preference,
        message: normalizedMessage,
      });
    }

    return this.handleAnswerWithExtraction({
      preference,
      message: normalizedMessage,
    });
  }

  async handleAnswerWithModel({ preference, message }) {
    let extraction = {};

    try {
      extraction = await this.extractionModel.extractOnboardingPreferences({
        message,
        preference: this.toPatch(preference),
        onboardingStep: preference.onboardingStep ?? 0,
      });
    } catch (error) {
      console.warn(`Onboarding extraction failed. Falling back to local parser: ${error.message}`);
    }

    return this.handleAnswerWithExtraction({
      preference,
      message,
      extraction: normalizeExtraction(extraction),
    });
  }

  handleAnswerWithExtraction({ preference, message, extraction = {} }) {
    const step = preference.onboardingStep ?? 0;

    if (step <= 0) return this.handleProfileAndConcernStep(preference, message, extraction);
    if (step === 1) return this.handleSafetyStep(preference, message, extraction);
    if (step === 2) return this.handleMedicationStep(preference, message, extraction);
    return this.handleLifestyleStep(preference, message, extraction);
  }

  handleProfileAndConcernStep(preference, message, extraction = {}) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message, extraction);
    const ageGroup = extraction.ageGroup ?? parseAgeGroup(message) ?? preference.ageGroup;
    const gender = extraction.gender ?? parseGender(message) ?? preference.gender;
    const healthConcerns = mergeUnique(
      preference.healthConcerns,
      extraction.healthConcerns,
      findKeywordMatches(message, healthConcernKeywords),
    );
    const goals = mergeUnique(
      preference.goals,
      extraction.goals,
      findKeywordMatches(message, goalKeywords),
    );

    if (!ageGroup || healthConcerns.length === 0) {
      const hasSavedSafetyContext = patch.safetyNotes.length > (preference.safetyNotes ?? []).length;
      const missingParts = [
        !ageGroup ? '연령대' : null,
        healthConcerns.length === 0 ? '건강 고민' : null,
      ].filter(Boolean).join('와 ');
      const reaskMessage =
        `이번 답변만으로는 ${missingParts}을 확인하기 어려워요. ` +
        onboardingQuestions.healthConcern;
      return this.reask({
        patch: { ...patch, ageGroup, gender, healthConcerns, goals, onboardingStep: 0 },
        message: hasSavedSafetyContext
          ? `말씀해주신 질환/복용 관련 정보는 저장했어요. ${reaskMessage}`
          : reaskMessage,
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

  handleSafetyStep(preference, message, extraction = {}) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message, extraction);
    const pregnancyStatus =
      extraction.pregnancyStatus ?? parsePregnancyStatus(message) ?? preference.pregnancyStatus;
    const chronicConditions = mergeUnique(
      preference.chronicConditions,
      extraction.chronicConditions,
      findKeywordMatches(message, chronicConditionKeywords),
    );
    const hasNoCondition =
      extraction.hasNoChronicConditions ||
      /(질환.*없|지병.*없|없어요|없습니다|해당 없음|해당없음)/.test(message);

    if (
      !pregnancyStatus &&
      chronicConditions.length === 0 &&
      !hasNoCondition &&
      !extraction.hasNoPregnancyContext
    ) {
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

  handleMedicationStep(preference, message, extraction = {}) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message, extraction);
    const medications = mergeUnique(
      preference.medications,
      extraction.medications,
      findKeywordMatches(message, medicationKeywords),
    );
    const currentSupplements = mergeUnique(
      preference.currentSupplements,
      extraction.currentSupplements,
      findKeywordMatches(message, supplementKeywords),
    );
    const hasNone =
      extraction.hasNoMedications ||
      /(복용.*없|먹는.*없|없어요|없습니다|해당 없음|해당없음)/.test(message);

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

  handleLifestyleStep(preference, message, extraction = {}) {
    const patch = this.mergeSafetyNotes(this.toPatch(preference), message, extraction);
    const lifestylePatterns = mergeUnique(
      preference.lifestylePatterns,
      extraction.lifestylePatterns,
      findKeywordMatches(message, lifestylePatternKeywords),
    );
    const avoidIngredients = mergeUnique(
      preference.avoidIngredients,
      extraction.avoidIngredients,
      findKeywordMatches(message, avoidIngredientKeywords),
    );
    const preferredFormats = mergeUnique(
      preference.preferredFormats,
      extraction.preferredFormats,
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

  mergeSafetyNotes(patch, message, extraction = {}) {
    const safetyNotes = mergeUnique(patch.safetyNotes, [
      ...arrayOrEmpty(extraction.medications),
      ...arrayOrEmpty(extraction.chronicConditions),
      extraction.pregnancyStatus,
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
