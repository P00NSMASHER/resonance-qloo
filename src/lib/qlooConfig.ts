export const DEFAULT_QLOO_API_BASE_URL = 'https://hackathon.api.qloo.com';

const TRUSTED_QLOO_HOSTS = new Set([
  'hackathon.api.qloo.com',
  'api.qloo.com',
]);

function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function resolveQlooBaseUrl(raw: string | undefined, allowLocalMock = false) {
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

  const trustedQlooHost = TRUSTED_QLOO_HOSTS.has(url.hostname);
  const allowedLocalMock = allowLocalMock && isLoopbackHostname(url.hostname);
  if (!trustedQlooHost && !allowedLocalMock) {
    throw new Error('QLOO_API_BASE_URL must use a trusted Qloo API origin.');
  }
  if (trustedQlooHost && url.port && url.port !== '443') {
    throw new Error('QLOO_API_BASE_URL must use the standard HTTPS port for Qloo.');
  }

  return url.origin;
}
