import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXPECTED_QLOO_API_ORIGIN = 'https://hackathon.api.qloo.com';
const EXPECTED_CONTRACT_VERSION = JSON.parse(
  await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'),
).version;
const checkerPath = fileURLToPath(new URL('./check-live-qloo.mjs', import.meta.url));

function runChecker(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [checkerPath], {
      env:{
        ...process.env,
        RESONANCE_BASE_URL:baseUrl,
        EXPECTED_QLOO_API_ORIGIN,
      },
      stdio:['ignore','pipe','pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

async function withStatus(mode, fn) {
  const statusPayload = {
    service:'resonance',
    contractVersion:mode === 'wrong-contract' ? 'stale-contract' : EXPECTED_CONTRACT_VERSION,
    qlooApiOrigin:EXPECTED_QLOO_API_ORIGIN,
    mode:mode === 'preview' ? 'preview' : 'live',
    qlooStatus:mode === 'preview' ? 'preview' : 'ready',
    qlooConfigured:mode !== 'preview',
    qlooConnected:mode !== 'preview',
  };

  const server = createServer((req, res) => {
    if (req.url === '/api/status') {
      if (mode === 'floot-ready') {
        res.writeHead(200, { 'content-type':'text/html; charset=utf-8' });
        res.end('<!doctype html><title>frontend shell</title>');
        return;
      }
      res.writeHead(200, { 'content-type':'application/json; charset=utf-8' });
      res.end(JSON.stringify(statusPayload));
      return;
    }
    if (req.url === '/_api/status') {
      if (mode === 'floot-ready') {
        res.writeHead(200, { 'content-type':'application/json; charset=utf-8' });
        res.end(JSON.stringify({ json:statusPayload }));
        return;
      }
      res.writeHead(404, { 'content-type':'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error:'not found' }));
      return;
    }
    res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
    res.end('not found');
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Live-readiness mock did not expose a TCP port.');
  }

  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

const ready = await withStatus('ready', runChecker);
if (ready.code !== 0 || !ready.stdout.includes('Live Qloo readiness passed via /api/status')) {
  throw new Error(`Expected direct ready status to pass. stdout=${ready.stdout} stderr=${ready.stderr}`);
}

const flootReady = await withStatus('floot-ready', runChecker);
if (flootReady.code !== 0 || !flootReady.stdout.includes('Live Qloo readiness passed via /_api/status')) {
  throw new Error(`Expected Floot wrapped ready status to pass. stdout=${flootReady.stdout} stderr=${flootReady.stderr}`);
}

const preview = await withStatus('preview', runChecker);
const previewOutput = preview.stdout + '\n' + preview.stderr;
if (
  preview.code !== 2 ||
  !previewOutput.includes('NOT READY:') ||
  !previewOutput.includes('mode=preview') ||
  !previewOutput.includes('qlooConfigured=false') ||
  !previewOutput.includes('qlooConnected=false')
) {
  throw new Error(`Expected current preview deployment to exit 2 as not ready. stdout=${preview.stdout} stderr=${preview.stderr}`);
}

const wrongContract = await withStatus('wrong-contract', runChecker);
const wrongOutput = wrongContract.stdout + '\n' + wrongContract.stderr;
if (wrongContract.code === 0 || !wrongOutput.includes('contractVersion=') || !wrongOutput.includes(EXPECTED_CONTRACT_VERSION)) {
  throw new Error(`Expected wrong contract to fail clearly. stdout=${wrongContract.stdout} stderr=${wrongContract.stderr}`);
}

console.log('Live Qloo readiness self-test passed.');
