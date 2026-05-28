export class UserPreference {
  constructor({
    id = null,
    userId,
    ageGroup = null,
    gender = null,
    healthConcerns = [],
    goals = [],
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
    this.avoidIngredients = avoidIngredients;
    this.preferredFormats = preferredFormats;
    this.isOnboardingCompleted = isOnboardingCompleted;
    this.onboardingStep = onboardingStep;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

