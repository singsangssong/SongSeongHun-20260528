export class UserPreference {
  constructor({
    id = null,
    userId,
    ageGroup = null,
    gender = null,
    healthConcerns = [],
    goals = [],
    pregnancyStatus = null,
    chronicConditions = [],
    medications = [],
    currentSupplements = [],
    lifestylePatterns = [],
    safetyNotes = [],
    avoidIngredients = [],
    preferredFormats = [],
    isOnboardingCompleted = false,
    onboardingStep = 0,
    createdAt = null,
    updatedAt = null,
  }) {
    if (!userId) {
      throw new Error('UserPreference.userId is required');
    }

    this.id = id;
    this.userId = userId;
    this.ageGroup = ageGroup;
    this.gender = gender;
    this.healthConcerns = healthConcerns;
    this.goals = goals;
    this.pregnancyStatus = pregnancyStatus;
    this.chronicConditions = chronicConditions;
    this.medications = medications;
    this.currentSupplements = currentSupplements;
    this.lifestylePatterns = lifestylePatterns;
    this.safetyNotes = safetyNotes;
    this.avoidIngredients = avoidIngredients;
    this.preferredFormats = preferredFormats;
    this.isOnboardingCompleted = isOnboardingCompleted;
    this.onboardingStep = onboardingStep;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
