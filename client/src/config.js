const localApiBaseUrl = 'http://localhost:3000';

export const apiBaseUrl = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? localApiBaseUrl : ''),
);

export const isApiBaseUrlConfigured = import.meta.env.PROD || Boolean(apiBaseUrl);

function normalizeUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}
