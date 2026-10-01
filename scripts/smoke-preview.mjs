import { spawn } from 'node:child_process';

const port = 8790;
const base = `http://127.0.0.1:${port}`;
const child = spawn('npm', ['run', 'start'], {
  env: { ...process.env, PORT: String(port), QLOO_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32'
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

try {
  await waitForServer();

  const status = await fetch(base + '/api/status');
  const statusBody = await status.json();
  if (status.status !== 200 || statusBody.qlooConnected !== false || statusBody.mode !== 'preview') {
    throw new Error('Preview status contract failed: ' + JSON.stringify(statusBody));
  }

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
}
