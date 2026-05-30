const localApiBaseUrl = 'http://localhost:3000';

export const apiBaseUrl = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? localApiBaseUrl : ''),
);

export const isApiBaseUrlConfigured = Boolean(apiBaseUrl);

function normalizeUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}
