export function parseJsonField(value, fallback = []) {
  if (value == null) return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function stringifyJsonField(value, fallback = []) {
  return JSON.stringify(value ?? fallback);
}

