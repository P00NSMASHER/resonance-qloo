import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { extractAffinities, extractResolved } from '../src/lib/qlooLogic';
import { orchestrateSession } from '../src/lib/agentPlanner';
import { QlooClient, QlooHttpError } from '../src/lib/qlooClient';

const PORT = Number(process.env.PORT || 8787);
const DIST = resolve('dist');
const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_ENERGY = new Set(['calm', 'social', 'active']);
const ALLOWED_SETTING = new Set(['one-on-one', 'small-group', 'community']);

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
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

async function handleStatus(res: import('node:http').ServerResponse) {
  const key = process.env.QLOO_API_KEY?.trim();
  json(res, 200, {
    qlooConnected: Boolean(key),
    mode: key ? 'live' : 'preview',
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

  const anchors = Array.isArray(body.anchors)
    ? [...new Set(
        body.anchors
          .filter((x): x is string => typeof x === 'string')
          .map(x => x.trim())
          .filter(x => x.length >= 2 && x.length <= 100),
      )].slice(0, 4)
    : [];

  const energy = typeof body.energy === 'string' && ALLOWED_ENERGY.has(body.energy) ? body.energy : 'calm';
  const setting = typeof body.setting === 'string' && ALLOWED_SETTING.has(body.setting) ? body.setting : 'small-group';

  if (anchors.length < 2) {
    return json(res, 400, { error: 'Provide at least two distinct cultural anchors.' });
  }

  try {
    const qloo = new QlooClient(key);
    const resolved = [];

    for (const query of anchors) {
      const found = extractResolved(query, await qloo.search(query));
      if (found) resolved.push(found);
    }

    if (resolved.length < 2) {
      return json(res, 422, { error: 'Qloo could not confidently resolve enough anchors.' });
    }

    const affinities = extractAffinities(
      await qloo.tasteAnalysis(resolved.map(x => x.entityId))
    );
    const session = orchestrateSession(resolved, affinities, energy, setting);

    return json(res, 200, {
      summary: `Built from ${resolved.length} resolved Qloo entities and ${affinities.length} cross-category affinity signals.`,
      resolvedAnchors: resolved,
      affinities,
      plan: session.plan,
      agentTrace: session.agentTrace,
      evidence: session.evidence,
    });
  } catch (error) {
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
    res.writeHead(200, {
      'content-type': mime[extname(filePath)] || 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
    });
    res.end(data);
  } catch {
    try {
      const data = await readFile(resolve(DIST, 'index.html'));
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'x-content-type-options': 'nosniff',
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
    if (req.method === 'GET' && url.pathname === '/api/status') return handleStatus(res);
    if (req.method === 'POST' && url.pathname === '/api/recommend') return handleRecommend(req, res);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'API route not found.' });
    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error('request failure', error);
    return json(res, 500, { error: 'Unexpected server error.' });
  }
}).listen(PORT, () => console.log(`Resonance listening on http://localhost:${PORT}`));
