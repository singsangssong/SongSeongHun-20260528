import { preferredFormatKeywords } from './onboarding.keyword-dictionaries.js';

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function mergeUnique(...groups) {
  return unique(groups.flatMap((group) => group ?? []));
}

export function arrayOrEmpty(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function findKeywordMatches(message, dictionary) {
  return dictionary
    .filter(([, keywords]) => keywords.some((keyword) => message.includes(keyword)))
    .map(([value]) => value);
}

export function findPreferredFormats(message) {
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

export function parseAgeGroup(message) {
  const match = message.match(/([2-7]0)대/);
  return match ? `${match[1]}s` : null;
}

export function parseGender(message) {
  if (/(여성|여자|엄마|어머니|아내)/.test(message)) return 'female';
  if (/(남성|남자|아빠|아버지|남편)/.test(message)) return 'male';
  return null;
}

export function parsePregnancyStatus(message) {
  if (/(임신.*아니|임신.*없|수유.*아니|해당 없음|해당없음)/.test(message)) {
    return 'not_pregnant';
  }
  if (/임신 준비/.test(message)) return 'planning';
  if (/수유/.test(message)) return 'breastfeeding';
  if (/임신/.test(message)) return 'pregnant';
  return null;
}
