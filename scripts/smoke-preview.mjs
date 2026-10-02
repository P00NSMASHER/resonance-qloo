import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer as createHttpsServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PREVIEW_PORT = 8790;
const LIVE_PORT = 8791;
const RETRY_PORT = 8792;
const HACKATHON_ORIGIN = 'https://hackathon.api.qloo.com';
const UUID_A = 'FCE8B172-4795-43E4-B222-3B550DC05FD9';
const UUID_B = '9A25B172-4795-43E4-B222-3B550DC05AAA';

function spawnResonance(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    env: {
      ...process.env,
      PORT:String(port),
      ...extraEnv,
    },
    stdio:['ignore','pipe','pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += String(chunk); });
  return { child, getStderr:() => stderr };
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    once(child, 'exit'),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ]);
}

async function waitForServer(base, getStderr) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(base + '/api/status');
      if (r.ok) return r.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become ready in time. ' + getStderr().slice(-1000));
}

function requireHeader(response, name, expectedFragment) {
  const value = response.headers.get(name) || '';
  if (!value.includes(expectedFragment)) {
    throw new Error(`Missing/invalid ${name}: expected ${expectedFragment}, got ${value || '(missing)'}`);
  }
}

async function createTlsFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'resonance-qloo-smoke-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  const generated = spawnSync('openssl', [
    'req','-x509','-newkey','rsa:2048','-nodes',
    '-keyout',keyPath,
    '-out',certPath,
    '-days','1',
    '-subj','/CN=localhost',
  ], { stdio:'ignore' });

  if (generated.error || generated.status !== 0) {
    await rm(directory, { recursive:true, force:true });
    if (process.env.CI) {
      throw new Error('OpenSSL is required for the CI live-Qloo smoke fixture.');
    }
    return null;
  }

  return {
    directory,
    key:await readFile(keyPath),
    cert:await readFile(certPath),
  };
}

async function startMockQloo(tls) {
  let probeReady = true;
  let probeCalls = 0;
  let searchCalls = 0;
  let insightCalls = 0;
  const server = createHttpsServer({ key:tls.key, cert:tls.cert }, (req, res) => {
    const url = new URL(req.url || '/', 'https://localhost');
    const send = (status, body) => {
      res.writeHead(status, {
        'content-type':'application/json; charset=utf-8',
        'cache-control':'no-store',
      });
      res.end(JSON.stringify(body));
    };

    if (req.headers['x-api-key'] !== 'smoke-key') {
      send(401, { error:'bad smoke key' });
      return;
    }

    if (url.pathname === '/v2/tags/types') {
      probeCalls += 1;
      if (!probeReady) {
        send(503, { error:'mock probe unavailable' });
        return;
      }
      send(200, { results:{ types:[] } });
      return;
    }

    if (url.pathname === '/search') {
      searchCalls += 1;
      const query = url.searchParams.get('query') || '';
      const result = query === 'Italian food'
        ? { entity_id:UUID_B, name:'Italian cuisine' }
        : { entity_id:UUID_A, name:query || 'Ella Fitzgerald' };
      send(200, { results:[result] });
      return;
    }

    if (url.pathname === '/v2/insights') {
      insightCalls += 1;
      send(200, {
        results:{
          tags:[
            { name:'Jazz' },
            { name:'Musicals' },
            { name:'Classic cinema' },
          ],
        },
      });
      return;
    }

    send(404, { error:'unknown mock Qloo path' });
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Mock Qloo server did not expose a TCP port.');
  }

  return {
    server,
    baseUrl:`https://127.0.0.1:${address.port}`,
    setProbeReady:(value) => { probeReady = Boolean(value); },
    probeCalls:() => probeCalls,
    searchCalls:() => searchCalls,
    insightCalls:() => insightCalls,
  };
}

async function stopServer(server) {
  if (!server) return;
  server.close();
  await once(server, 'close');
}

let previewChild;
let liveChild;
let retryChild;
let mockQloo;
let tls;

try {
  const preview = spawnResonance(PREVIEW_PORT, {
    QLOO_API_KEY:'',
    QLOO_API_BASE_URL:HACKATHON_ORIGIN,
  });
  previewChild = preview.child;
  const previewBase = `http://127.0.0.1:${PREVIEW_PORT}`;
  await waitForServer(previewBase, preview.getStderr);

  const status = await fetch(previewBase + '/api/status');
  const statusBody = await status.json();
  if (
    status.status !== 200 ||
    statusBody.qlooConnected !== false ||
    statusBody.mode !== 'preview' ||
    statusBody.qlooApiOrigin !== HACKATHON_ORIGIN
  ) {
    throw new Error('Preview status contract failed: ' + JSON.stringify(statusBody));
  }
  requireHeader(status, 'content-security-policy', "default-src 'self'");
  requireHeader(status, 'content-security-policy', "frame-ancestors 'none'");
  requireHeader(status, 'permissions-policy', 'camera=()');
  requireHeader(status, 'x-frame-options', 'DENY');
  requireHeader(status, 'x-content-type-options', 'nosniff');
  requireHeader(status, 'referrer-policy', 'no-referrer');

  const page = await fetch(previewBase + '/');
  if (page.status !== 200) throw new Error('Static app shell should return 200, got ' + page.status);
  requireHeader(page, 'content-security-policy', "default-src 'self'");
  requireHeader(page, 'x-frame-options', 'DENY');
  requireHeader(page, 'referrer-policy', 'same-origin');
  requireHeader(page, 'cache-control', 'no-cache');
  const html = await page.text();
  const assetMatch = html.match(/(?:src|href)=["']([^"']*\/assets\/[^"']+)["']/i);
  if (!assetMatch) throw new Error('Built app shell did not reference a hashed production asset.');
  const asset = await fetch(new URL(assetMatch[1], previewBase));
  if (asset.status !== 200) throw new Error('Production asset should return 200, got ' + asset.status);
  requireHeader(asset, 'cache-control', 'public, max-age=31536000, immutable');

  const recommend = await fetch(previewBase + '/api/recommend', {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body:JSON.stringify({
      anchors:['Ella Fitzgerald',"Singin' in the Rain",'Italian food'],
      energy:'calm',
      setting:'small-group',
    }),
  });
  const recommendBody = await recommend.json();
  if (recommend.status !== 503 || !String(recommendBody.error || '').includes('not connected')) {
    throw new Error('Missing-key fail-closed contract failed: ' + recommend.status + ' ' + JSON.stringify(recommendBody));
  }

  const missing = await fetch(previewBase + '/api/nope');
  if (missing.status !== 404) {
    throw new Error('Unknown API route should return 404, got ' + missing.status);
  }

  const missingAsset = await fetch(previewBase + '/assets/definitely-missing.js');
  if (missingAsset.status !== 404) {
    throw new Error('Missing hashed/static asset should return 404, got ' + missingAsset.status);
  }
  const missingAssetBody = await missingAsset.json();
  if (!String(missingAssetBody.error || '').includes('Static asset not found')) {
    throw new Error('Missing static asset did not return the explicit 404 contract.');
  }

  const spaRoute = await fetch(previewBase + '/judge-walkthrough');
  if (spaRoute.status !== 200 || !String(spaRoute.headers.get('content-type') || '').includes('text/html')) {
    throw new Error('Extensionless SPA route should still fall back to index.html.');
  }

  await stopChild(previewChild);
  previewChild = null;

  tls = await createTlsFixture();
  if (tls) {
    mockQloo = await startMockQloo(tls);
    const live = spawnResonance(LIVE_PORT, {
      QLOO_API_KEY:'smoke-key',
      QLOO_API_BASE_URL:mockQloo.baseUrl,
      QLOO_ALLOW_LOCAL_MOCK:'1',
      NODE_TLS_REJECT_UNAUTHORIZED:'0',
    });
    liveChild = live.child;
    const liveBase = `http://127.0.0.1:${LIVE_PORT}`;
    const liveStatus = await waitForServer(liveBase, live.getStderr);

    if (
      liveStatus.qlooConnected !== true ||
      liveStatus.mode !== 'live' ||
      liveStatus.qlooStatus !== 'ready' ||
      liveStatus.qlooApiOrigin !== mockQloo.baseUrl
    ) {
      throw new Error('Mock-live status contract failed: ' + JSON.stringify(liveStatus));
    }

    const request = {
      anchors:['Ella Fitzgerald','Italian food'],
      energy:'calm',
      setting:'small-group',
      durationMinutes:45,
    };

    const reviewResponse = await fetch(liveBase + '/api/recommend', {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body:JSON.stringify(request),
    });
    const reviewBody = await reviewResponse.json();
    if (
      reviewResponse.status !== 409 ||
      reviewBody.code !== 'QLOO_RESOLUTION_REVIEW_REQUIRED' ||
      !Array.isArray(reviewBody.resolvedAnchors)
    ) {
      throw new Error('Review-required HTTP contract failed: ' + reviewResponse.status + ' ' + JSON.stringify(reviewBody));
    }
    if (mockQloo.searchCalls() !== 2) {
      throw new Error(`Expected two Qloo searches during resolution review, got ${mockQloo.searchCalls()}.`);
    }
    if (mockQloo.insightCalls() !== 0) {
      throw new Error('Taste analysis ran before non-exact Qloo matches were confirmed.');
    }

    const reviewed = reviewBody.resolvedAnchors.find(item => item.resolutionMatch === 'top-result');
    if (!reviewed || reviewed.entityId !== UUID_B || reviewed.name !== 'Italian cuisine') {
      throw new Error('Review payload did not expose the expected Qloo top-result mapping: ' + JSON.stringify(reviewBody));
    }

    const confirmedResponse = await fetch(liveBase + '/api/recommend', {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body:JSON.stringify({
        ...request,
        confirmedEntityIds:[reviewed.entityId],
      }),
    });
    const confirmedBody = await confirmedResponse.json();
    if (confirmedResponse.status !== 200) {
      throw new Error('Confirmed live recommendation failed: ' + confirmedResponse.status + ' ' + JSON.stringify(confirmedBody));
    }
    if (mockQloo.searchCalls() !== 2) {
      throw new Error(`Confirmation should reuse cached Qloo resolutions; got ${mockQloo.searchCalls()} total search calls.`);
    }
    if (mockQloo.insightCalls() !== 1) {
      throw new Error(`Expected exactly one taste-analysis call after confirmation, got ${mockQloo.insightCalls()}.`);
    }
    if (
      confirmedBody.provenance?.source !== 'qloo-live' ||
      confirmedBody.provenance?.apiOrigin !== mockQloo.baseUrl ||
      confirmedBody.evidence?.topResultResolutionCount !== 1 ||
      confirmedBody.evidence?.selectedAffinityCount !== 3 ||
      confirmedBody.evidence?.returnedAffinityCount !== 3
    ) {
      throw new Error('Confirmed response evidence contract failed: ' + JSON.stringify(confirmedBody));
    }
    if (confirmedBody.plan?.[3]?.affinityLabel !== 'Classic cinema') {
      throw new Error('Three-signal closing step should reuse the last real selected signal.');
    }

    await stopChild(liveChild);
    liveChild = null;

    mockQloo.setProbeReady(false);
    const retryServer = spawnResonance(RETRY_PORT, {
      QLOO_API_KEY:'smoke-key',
      QLOO_API_BASE_URL:mockQloo.baseUrl,
      QLOO_ALLOW_LOCAL_MOCK:'1',
      NODE_TLS_REJECT_UNAUTHORIZED:'0',
    });
    retryChild = retryServer.child;
    const retryBase = `http://127.0.0.1:${RETRY_PORT}`;
    const degradedStatus = await waitForServer(retryBase, retryServer.getStderr);
    if (
      degradedStatus.qlooConnected !== false ||
      degradedStatus.qlooStatus !== 'degraded' ||
      degradedStatus.mode !== 'preview'
    ) {
      throw new Error('Expected cached degraded status before manual retry: ' + JSON.stringify(degradedStatus));
    }
    const probesAfterDegraded = mockQloo.probeCalls();

    mockQloo.setProbeReady(true);
    const cachedDegradedResponse = await fetch(retryBase + '/api/status');
    const cachedDegraded = await cachedDegradedResponse.json();
    if (cachedDegraded.qlooStatus !== 'degraded' || mockQloo.probeCalls() !== probesAfterDegraded) {
      throw new Error('Ordinary status read should preserve the cached degraded probe before explicit retry.');
    }

    const refreshedResponse = await fetch(retryBase + '/api/status?refresh=1');
    const refreshed = await refreshedResponse.json();
    if (
      refreshed.qlooConnected !== true ||
      refreshed.qlooStatus !== 'ready' ||
      refreshed.mode !== 'live' ||
      mockQloo.probeCalls() !== probesAfterDegraded + 1
    ) {
      throw new Error('Manual status refresh did not re-probe Qloo and recover: ' + JSON.stringify(refreshed));
    }

    const probesAfterReady = mockQloo.probeCalls();
    const healthyRefreshResponse = await fetch(retryBase + '/api/status?refresh=1');
    const healthyRefresh = await healthyRefreshResponse.json();
    if (
      healthyRefresh.qlooStatus !== 'ready' ||
      mockQloo.probeCalls() !== probesAfterReady
    ) {
      throw new Error('Manual refresh should not discard or re-probe a healthy cached Qloo state.');
    }
  } else {
    console.warn('OpenSSL unavailable; skipped local HTTPS Qloo review-handshake smoke.');
  }

  console.log('Preview + review-handshake smoke test passed.');
} finally {
  await stopChild(previewChild);
  await stopChild(liveChild);
  await stopChild(retryChild);
  await stopServer(mockQloo?.server);
  if (tls?.directory) {
    await rm(tls.directory, { recursive:true, force:true });
  }
}
