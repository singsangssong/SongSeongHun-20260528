import {
  parseAgeGroup,
  parseGender,
  parsePregnancyStatus,
  unique,
} from './onboarding.parser.js';

export function normalizeExtraction(value) {
  const source = value && typeof value === 'object' ? value : {};

  return {
    ageGroup: normalizeAgeGroup(source.ageGroup),
    gender: normalizeGender(source.gender),
    healthConcerns: normalizeStringArray(source.healthConcerns),
    goals: normalizeStringArray(source.goals),
    pregnancyStatus: normalizePregnancyStatus(source.pregnancyStatus),
    hasNoPregnancyContext: Boolean(source.hasNoPregnancyContext),
    chronicConditions: normalizeStringArray(source.chronicConditions),
    hasNoChronicConditions: Boolean(source.hasNoChronicConditions),
    medications: normalizeStringArray(source.medications),
    hasNoMedications: Boolean(source.hasNoMedications),
    currentSupplements: normalizeStringArray(source.currentSupplements),
    lifestylePatterns: normalizeStringArray(source.lifestylePatterns),
    avoidIngredients: normalizeStringArray(source.avoidIngredients),
    preferredFormats: normalizeStringArray(source.preferredFormats),
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return unique(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean),
  );
}

function normalizeAgeGroup(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^[2-7]0s$/.test(trimmed)) return trimmed;

  return parseAgeGroup(trimmed);
}

function normalizeGender(value) {
  if (value === 'female' || value === 'male') return value;
  if (typeof value !== 'string') return null;

  return parseGender(value.trim());
}

function normalizePregnancyStatus(value) {
  if (['pregnant', 'planning', 'breastfeeding', 'not_pregnant'].includes(value)) {
    return value;
  }
  if (typeof value !== 'string') return null;

  return parsePregnancyStatus(value.trim());
}
