import { parseJsonField, stringifyJsonField } from '../../../global/db/json.js';
import { UserPreference } from '../entity/user-preference.entity.js';

function toUserPreference(row) {
  if (!row) return null;

  return new UserPreference({
    id: row.id,
    userId: row.user_id,
    ageGroup: row.age_group,
    gender: row.gender,
    healthConcerns: parseJsonField(row.health_concerns),
    goals: parseJsonField(row.goals),
    pregnancyStatus: row.pregnancy_status,
    chronicConditions: parseJsonField(row.chronic_conditions),
    medications: parseJsonField(row.medications),
    currentSupplements: parseJsonField(row.current_supplements),
    lifestylePatterns: parseJsonField(row.lifestyle_patterns),
    safetyNotes: parseJsonField(row.safety_notes),
    avoidIngredients: parseJsonField(row.avoid_ingredients),
    preferredFormats: parseJsonField(row.preferred_formats),
    isOnboardingCompleted: Boolean(row.is_onboarding_completed),
    onboardingStep: row.onboarding_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class UserPreferenceRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUserId(userId) {
    const [rows] = await this.db.execute(
      `SELECT id, user_id, age_group, gender, health_concerns, goals,
              pregnancy_status, chronic_conditions, medications,
              current_supplements, lifestyle_patterns, safety_notes,
              avoid_ingredients, preferred_formats, is_onboarding_completed,
              onboarding_step, created_at, updated_at
       FROM user_preferences
       WHERE user_id = ?
       LIMIT 1`,
      [userId],
    );

    return toUserPreference(rows[0]);
  }

  async createDefault({ userId }) {
    const [result] = await this.db.execute(
      `INSERT INTO user_preferences (
         user_id, health_concerns, goals, pregnancy_status,
         chronic_conditions, medications, current_supplements,
         lifestyle_patterns, safety_notes, avoid_ingredients, preferred_formats
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        stringifyJsonField([]),
        stringifyJsonField([]),
        null,
        stringifyJsonField([]),
        stringifyJsonField([]),
        stringifyJsonField([]),
        stringifyJsonField([]),
        stringifyJsonField([]),
        stringifyJsonField([]),
        stringifyJsonField([]),
      ],
    );

    return new UserPreference({
      id: result.insertId,
      userId,
    });
  }

  async updateOnboarding({ userId, patch }) {
    await this.db.execute(
      `UPDATE user_preferences
       SET age_group = ?,
           gender = ?,
           health_concerns = ?,
           goals = ?,
           pregnancy_status = ?,
           chronic_conditions = ?,
           medications = ?,
           current_supplements = ?,
           lifestyle_patterns = ?,
           safety_notes = ?,
           avoid_ingredients = ?,
           preferred_formats = ?,
           is_onboarding_completed = ?,
           onboarding_step = ?
       WHERE user_id = ?`,
      [
        patch.ageGroup ?? null,
        patch.gender ?? null,
        stringifyJsonField(patch.healthConcerns ?? []),
        stringifyJsonField(patch.goals ?? []),
        patch.pregnancyStatus ?? null,
        stringifyJsonField(patch.chronicConditions ?? []),
        stringifyJsonField(patch.medications ?? []),
        stringifyJsonField(patch.currentSupplements ?? []),
        stringifyJsonField(patch.lifestylePatterns ?? []),
        stringifyJsonField(patch.safetyNotes ?? []),
        stringifyJsonField(patch.avoidIngredients ?? []),
        stringifyJsonField(patch.preferredFormats ?? []),
        patch.isOnboardingCompleted ? 1 : 0,
        patch.onboardingStep ?? 0,
        userId,
      ],
    );

    return this.findByUserId(userId);
  }
}
