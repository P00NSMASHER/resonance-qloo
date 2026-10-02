export const DEFAULT_QLOO_API_BASE_URL = 'https://hackathon.api.qloo.com';

export function resolveQlooBaseUrl(raw: string | undefined) {
  const value = raw?.trim() || DEFAULT_QLOO_API_BASE_URL;
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('QLOO_API_BASE_URL must be a valid HTTPS URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('QLOO_API_BASE_URL must use HTTPS.');
  }

  if (url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) {
    throw new Error('QLOO_API_BASE_URL must be a clean HTTPS origin.');
  }

  return url.origin;
}
