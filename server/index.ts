import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { extractAffinities, extractResolved, planFromTags } from '../src/lib/qlooLogic';

const PORT = Number(process.env.PORT || 8787);
const DIST = resolve('dist');

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req: import('node:http').IncomingMessage) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}') as Record<string, unknown>;
}

async function handleStatus(res: import('node:http').ServerResponse) {
  const key = process.env.QLOO_API_KEY?.trim();
  json(res, 200, { qlooConnected: Boolean(key), mode: key ? 'live' : 'preview' });
}

async function handleRecommend(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) {
  const key = process.env.QLOO_API_KEY?.trim();
  if (!key) return json(res, 503, { error: 'Live Qloo access is not connected yet.' });

  const body = await readJson(req);
  const anchors = Array.isArray(body.anchors) ? body.anchors.filter(x => typeof x === 'string').slice(0,4) as string[] : [];
  const energy = typeof body.energy === 'string' ? body.energy : 'calm';
  const setting = typeof body.setting === 'string' ? body.setting : 'small-group';
  if (anchors.length < 2) return json(res, 400, { error: 'Provide at least two cultural anchors.' });

  const headers = { 'x-api-key': key, accept: 'application/json' };
  const resolved = [];
  for (const query of anchors) {
    const url = new URL('https://api.qloo.com/search');
    url.searchParams.set('query', query);
    url.searchParams.set('take', '5');
    const response = await fetch(url, { headers });
    if (!response.ok) return json(res, 502, { error: `Qloo search failed (${response.status}).` });
    const found = extractResolved(query, await response.json());
    if (found) resolved.push(found);
  }
  if (resolved.length < 2) return json(res, 422, { error: 'Qloo could not confidently resolve enough anchors.' });

  const insights = new URL('https://api.qloo.com/v2/insights');
  insights.searchParams.set('filter.type', 'urn:tag');
  insights.searchParams.set('signal.interests.entities', resolved.map(x => x.urn).join(','));
  insights.searchParams.set('take', '8');
  const insightsResponse = await fetch(insights, { headers });
  if (!insightsResponse.ok) return json(res, 502, { error: `Qloo insights failed (${insightsResponse.status}).` });

  const affinities = extractAffinities(await insightsResponse.json());
  if (affinities.length < 3) return json(res, 422, { error: 'Qloo returned too little affinity data for a useful session.' });

  json(res, 200, {
    summary: `Built from ${resolved.length} resolved Qloo entities and ${affinities.length} cross-category affinities.`,
    resolvedAnchors: resolved,
    affinities,
    plan: planFromTags(affinities, energy, setting)
  });
}

const mime: Record<string,string> = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg'
};

async function serveStatic(pathname: string, res: import('node:http').ServerResponse) {
  const filePath = pathname === '/' ? join(DIST, 'index.html') : join(DIST, pathname);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not file');
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': mime[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(DIST, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
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
    return serveStatic(url.pathname, res);
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error' });
  }
}).listen(PORT, () => console.log(`Resonance listening on http://localhost:${PORT}`));