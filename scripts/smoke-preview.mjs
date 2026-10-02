import { spawn } from 'node:child_process';

const port = 8790;
const base = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
  env: { ...process.env, PORT: String(port), QLOO_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', chunk => { stderr += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(base + '/api/status');
      if (r.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become ready in time. ' + stderr.slice(-1000));
}

function requireHeader(response, name, expectedFragment) {
  const value = response.headers.get(name) || '';
  if (!value.includes(expectedFragment)) {
    throw new Error(`Missing/invalid ${name}: expected ${expectedFragment}, got ${value || '(missing)'}`);
  }
}

try {
  await waitForServer();

  const status = await fetch(base + '/api/status');
  const statusBody = await status.json();
  if (status.status !== 200 || statusBody.qlooConnected !== false || statusBody.mode !== 'preview') {
    throw new Error('Preview status contract failed: ' + JSON.stringify(statusBody));
  }
  requireHeader(status, 'content-security-policy', "default-src 'self'");
  requireHeader(status, 'content-security-policy', "frame-ancestors 'none'");
  requireHeader(status, 'permissions-policy', 'camera=()');
  requireHeader(status, 'x-frame-options', 'DENY');
  requireHeader(status, 'x-content-type-options', 'nosniff');
  requireHeader(status, 'referrer-policy', 'no-referrer');

  const page = await fetch(base + '/');
  if (page.status !== 200) throw new Error('Static app shell should return 200, got ' + page.status);
  requireHeader(page, 'content-security-policy', "default-src 'self'");
  requireHeader(page, 'x-frame-options', 'DENY');
  requireHeader(page, 'referrer-policy', 'same-origin');
  requireHeader(page, 'cache-control', 'no-cache');

  const recommend = await fetch(base + '/api/recommend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      anchors: ['Ella Fitzgerald', "Singin' in the Rain", 'Italian food'],
      energy: 'calm',
      setting: 'small-group'
    })
  });
  const recommendBody = await recommend.json();
  if (recommend.status !== 503 || !String(recommendBody.error || '').includes('not connected')) {
    throw new Error('Missing-key fail-closed contract failed: ' + recommend.status + ' ' + JSON.stringify(recommendBody));
  }

  const missing = await fetch(base + '/api/nope');
  if (missing.status !== 404) {
    throw new Error('Unknown API route should return 404, got ' + missing.status);
  }

  console.log('Preview smoke test passed.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
