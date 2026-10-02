import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { QlooClient, QlooHttpError } from '../src/lib/qlooClient';
import { createRateLimiter } from '../src/lib/rateLimiter';
import { createTtlCache } from '../src/lib/ttlCache';
import { resolveQlooBaseUrl } from '../src/lib/qlooConfig';
import { buildRecommendation, ResolutionReviewRequiredError } from '../src/lib/recommendationService';
import { normalizeRecommendationRequest, recommendationRequestValidationError } from '../src/lib/requestNormalization';
import { qlooSearchCacheKey, qlooTasteCacheKey } from '../src/lib/qlooCacheKey';
import { rateLimitClientKey } from '../src/lib/clientIdentity';
import { recommendationRequestContext } from '../src/lib/recommendationContext';
import { createResolutionReviewToken, resolutionReviewSigningKey, verifyResolutionReviewToken } from '../src/lib/resolutionReviewToken';

const PORT = Number(process.env.PORT || 8787);
const DIST = resolve('dist');
const MAX_BODY_BYTES = 16 * 1024;
const ALLOW_LOCAL_QLOO_MOCK =
  process.env.QLOO_ALLOW_LOCAL_MOCK === '1' &&
  (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
const QLOO_BASE_URL = resolveQlooBaseUrl(
  process.env.QLOO_API_BASE_URL,
  ALLOW_LOCAL_QLOO_MOCK,
);
const liveLimiter = createRateLimiter(12, 60_000);
const processLiveLimiter = createRateLimiter(60, 60_000);
const qlooProbeRefreshLimiter = createRateLimiter(2, 60_000);
const processQlooProbeRefreshLimiter = createRateLimiter(20, 60_000);
const searchCache = createTtlCache<unknown>(10 * 60_000, 200);
const tasteCache = createTtlCache<unknown>(5 * 60_000, 100);
const qlooProbeCache = createTtlCache<'ready' | 'degraded' | 'rate-limited'>(5 * 60_000, 4);

const SECURITY_HEADERS: import('node:http').OutgoingHttpHeaders = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
};

function json(
  res: import('node:http').ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: import('node:http').OutgoingHttpHeaders = {},
) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: import('node:http').IncomingMessage) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
  }
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function requestClientKey(req: import('node:http').IncomingMessage) {
  return rateLimitClientKey(req.headers['x-forwarded-for'], req.socket.remoteAddress);
}

function qlooCredentialFingerprint(key: string) {
  return createHash('sha256').update(`${QLOO_BASE_URL}\0${key}`).digest('hex').slice(0, 16);
}

async function handleStatus(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  forceRefresh = false,
) {
  const key = process.env.QLOO_API_KEY?.trim();
  if (!key) {
    return json(res, 200, {
      qlooConfigured: false,
      qlooConnected: false,
      qlooStatus: 'preview',
      qlooApiOrigin: QLOO_BASE_URL,
      mode: 'preview',
      service: 'resonance',
    });
  }

  const keyFingerprint = qlooCredentialFingerprint(key);

  if (forceRefresh) {
    const cachedStatus = qlooProbeCache.get(keyFingerprint);
    if (cachedStatus && cachedStatus !== 'ready') {
      const processRefreshLimit = processQlooProbeRefreshLimiter.check('process');
      const clientRefreshLimit = qlooProbeRefreshLimiter.check(requestClientKey(req));
      if (processRefreshLimit.allowed && clientRefreshLimit.allowed) {
        qlooProbeCache.delete(keyFingerprint);
      }
    }
  }

  const qlooStatus = await qlooProbeCache.getOrLoad(keyFingerprint, async () => {
    try {
      const qloo = new QlooClient(key, fetch, QLOO_BASE_URL);
      await qloo.probe();
      return 'ready' as const;
    } catch (error) {
      if (error instanceof QlooHttpError && error.status === 429) return 'rate-limited' as const;
      return 'degraded' as const;
    }
  });

  const ready = qlooStatus === 'ready';
  return json(res, 200, {
    qlooConfigured: true,
    qlooConnected: ready,
    qlooStatus,
    qlooApiOrigin: QLOO_BASE_URL,
    mode: ready ? 'live' : 'preview',
    service: 'resonance',
  });
}

async function handleRecommend(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) {
  const key = process.env.QLOO_API_KEY?.trim();
  if (!key) return json(res, 503, { error: 'Live Qloo access is not connected yet.' });

  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
      return json(res, 413, { error: 'Request body is too large.' });
    }
    return json(res, 400, { error: 'Request body must be valid JSON.' });
  }

  const requestValidationError = recommendationRequestValidationError(body);
  if (requestValidationError) {
    return json(res, 400, { error: requestValidationError });
  }

  const { anchors, energy, setting, durationMinutes, confirmedEntityIds, reviewToken } = normalizeRecommendationRequest(body);

  if (anchors.length < 2) {
    return json(res, 400, { error: 'Provide at least two distinct cultural anchors.' });
  }

  const requestContext = recommendationRequestContext({
    anchors,
    energy,
    setting,
    durationMinutes,
  });
  const reviewSigningKey = resolutionReviewSigningKey(key);
  const confirmationVerified =
    confirmedEntityIds.length > 0 &&
    verifyResolutionReviewToken(
      reviewSigningKey,
      requestContext,
      confirmedEntityIds,
      reviewToken,
    );

  // Charge the Qloo/live quota only after the request is bounded and valid.
  // Malformed public traffic should not be able to exhaust the upstream-call budget.
  const clientKey = requestClientKey(req);
  const processLimit = processLiveLimiter.check('process');
  if (!processLimit.allowed) {
    return json(res, 429, {
      error: `The public Qloo demo is temporarily busy. Try again in ${processLimit.retryAfterSeconds}s.`,
    }, { 'retry-after': String(processLimit.retryAfterSeconds) });
  }

  const limit = liveLimiter.check(clientKey);
  if (!limit.allowed) {
    return json(res, 429, {
      error: `Too many live Qloo requests. Try again in ${limit.retryAfterSeconds}s.`,
    }, { 'retry-after': String(limit.retryAfterSeconds) });
  }

  try {
    const qloo = new QlooClient(key, fetch, QLOO_BASE_URL);
    const credentialFingerprint = qlooCredentialFingerprint(key);
    const gateway = {
      search: (query: string, typeUrn?: string) => {
        const searchKey = qlooSearchCacheKey(credentialFingerprint, query, typeUrn);
        return searchCache.getOrLoad(searchKey, () => qloo.search(query, typeUrn));
      },
      tasteAnalysis: (entityIds: string[]) => {
        const tasteKey = qlooTasteCacheKey(credentialFingerprint, entityIds);
        return tasteCache.getOrLoad(tasteKey, () => qloo.tasteAnalysis(entityIds));
      },
    };

    const recommendation = await buildRecommendation(gateway, {
      anchors,
      energy,
      setting,
      durationMinutes,
      confirmedEntityIds,
      confirmationVerified,
    });

    return json(res, 200, {
      ...recommendation,
      provenance: {
        source: 'qloo-live',
        apiOrigin: QLOO_BASE_URL,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ResolutionReviewRequiredError) {
      const reviewEntityIds = error.resolvedAnchors
        .filter(item => item.resolutionMatch === 'top-result')
        .map(item => item.entityId);
      return json(res, 409, {
        error: 'Review Qloo entity matches before continuing.',
        code: 'QLOO_RESOLUTION_REVIEW_REQUIRED',
        requestContext: error.requestContext,
        resolvedAnchors: error.resolvedAnchors,
        reviewToken:createResolutionReviewToken(
          reviewSigningKey,
          error.requestContext,
          reviewEntityIds,
        ),
      });
    }
    if (error instanceof Error && error.message === 'QLOO_TIMEOUT') {
      return json(res, 504, { error: 'Qloo took too long to respond. Please try again.' });
    }
    if (error instanceof QlooHttpError) {
      const status = error.status === 429 ? 429 : 502;
      const message = error.status === 429
        ? 'Qloo rate limit reached. Please try again later.'
        : `Qloo ${error.endpoint} request failed (${error.status}).`;
      return json(res, status, { error: message });
    }
    if (error instanceof Error && (error.message === 'QLOO_EVIDENCE_TOO_SPARSE' || error.message === 'QLOO_EVIDENCE_TOO_WEAK')) {
      return json(res, 422, { error: 'Qloo returned too little reliable evidence for a useful session. Try more specific anchors.' });
    }
    console.error('recommendation failure', error);
    return json(res, 502, { error: 'The Qloo request could not be completed.' });
  }
}

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

async function serveStatic(pathname: string, res: import('node:http').ServerResponse) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = resolve(DIST, relativePath);

  if (filePath !== DIST && !filePath.startsWith(DIST + sep)) {
    return json(res, 400, { error: 'Invalid path.' });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not file');
    const data = await readFile(filePath);
    const cacheControl = relativePath.startsWith('assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'content-type': mime[extname(filePath)] || 'application/octet-stream',
      'cache-control': cacheControl,
      'referrer-policy': 'same-origin',
    });
    res.end(data);
  } catch {
    const isAssetLike = relativePath.startsWith('assets/') || extname(relativePath) !== '';
    if (isAssetLike) {
      return json(res, 404, { error: 'Static asset not found.' });
    }

    try {
      const data = await readFile(resolve(DIST, 'index.html'));
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache',
        'referrer-policy': 'same-origin',
      });
      res.end(data);
    } catch {
      json(res, 404, { error: 'Not found' });
    }
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return handleStatus(req, res, url.searchParams.get('refresh') === '1');
    }
    if (req.method === 'POST' && url.pathname === '/api/recommend') return handleRecommend(req, res);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'API route not found.' });
    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error('request failure', error);
    return json(res, 500, { error: 'Unexpected server error.' });
  }
}).listen(PORT, () => console.log(`Resonance listening on http://localhost:${PORT}`));
