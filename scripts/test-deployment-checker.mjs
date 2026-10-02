import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXPECTED_QLOO_API_ORIGIN = 'https://hackathon.api.qloo.com';
const EXPECTED_CONTRACT_VERSION = JSON.parse(
  await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'),
).version;
const checkerPath = fileURLToPath(new URL('./check-deployment.mjs', import.meta.url));
const markers = [
  EXPECTED_CONTRACT_VERSION,
  'How Qloo changed this plan',
  'Selection rule',
  'Request receipt',
  'Plan signal #',
  'Additional evidence',
  'Qloo top match · review',
  'Qloo top match · confirmed',
  'Review entity matches',
  'Top matches confirmed',
  'Qloo API',
  'No synthetic signal',
  'Interpretation limit',
  'aggregate cultural relationships',
  'Retry Qloo verification',
  'Qloo match review required',
  'Confirm matches & build',
  'QLOO_RESOLUTION_REVIEW_REQUIRED',
  'Static example · no live timestamp',
];

function runChecker(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [checkerPath], {
      env: {
        ...process.env,
        RESONANCE_BASE_URL: baseUrl,
        EXPECTED_QLOO_API_ORIGIN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
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

async function withMockDeployment(mode, fn) {
  const server = createServer((req, res) => {
    const statusPayload = {
      service:'resonance',
      contractVersion: mode === 'wrong-contract' ? 'stale-contract' : EXPECTED_CONTRACT_VERSION,
      qlooApiOrigin:EXPECTED_QLOO_API_ORIGIN,
      mode:'preview',
      qlooStatus:'preview',
    };

    if (req.url === '/api/status') {
      if (mode === 'html-status' || mode === 'floot-superjson') {
        res.writeHead(200, { 'content-type':'text/html; charset=utf-8' });
        res.end('<!doctype html><title>frontend shell</title>');
        return;
      }
      res.writeHead(200, { 'content-type':'application/json; charset=utf-8' });
      res.end(JSON.stringify(statusPayload));
      return;
    }

    if (req.url === '/_api/status') {
      if (mode === 'floot-superjson') {
        res.writeHead(200, { 'content-type':'application/json; charset=utf-8' });
        res.end(JSON.stringify({ json:statusPayload }));
        return;
      }
      if (mode === 'html-status') {
        res.writeHead(200, { 'content-type':'text/html; charset=utf-8' });
        res.end('<!doctype html><title>stale frontend</title>');
        return;
      }
      res.writeHead(404, { 'content-type':'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error:'not found' }));
      return;
    }

    if (req.url === '/' || req.url === '') {
      res.writeHead(200, { 'content-type':'text/html; charset=utf-8' });
      res.end('<!doctype html><script src="/_assets/app.js"></script>');
      return;
    }

    if (req.url === '/_assets/app.js') {
      const visibleMarkers = mode === 'missing-marker'
        ? markers.filter(marker => marker !== 'Confirm matches & build')
        : markers;
      res.writeHead(200, { 'content-type':'text/javascript; charset=utf-8' });
      if (mode === 'floot-dynamic') {
        res.end('const __vite__mapDeps=(m=["_assets/page.js","_assets/vendor.js"]);');
      } else {
        res.end(visibleMarkers.map(marker => JSON.stringify(marker)).join(';\n'));
      }
      return;
    }

    if (req.url === '/_assets/page.js' && mode === 'floot-dynamic') {
      res.writeHead(200, { 'content-type':'text/javascript; charset=utf-8' });
      res.end(markers.map(marker => JSON.stringify(marker)).join(';\n'));
      return;
    }

    if (req.url === '/_assets/vendor.js' && mode === 'floot-dynamic') {
      res.writeHead(200, { 'content-type':'text/javascript; charset=utf-8' });
      res.end('export const vendor=true;');
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
    throw new Error('Mock deployment did not expose a TCP port.');
  }

  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

const current = await withMockDeployment('current', runChecker);
if (current.code !== 0 || !current.stdout.includes('Public deployment frontend + backend parity passed.')) {
  throw new Error(`Expected current deployment to pass. stdout=${current.stdout} stderr=${current.stderr}`);
}

const floot = await withMockDeployment('floot-superjson', runChecker);
if (
  floot.code !== 0 ||
  !floot.stdout.includes('Public backend status passed via /_api/status') ||
  !floot.stdout.includes('Public deployment frontend + backend parity passed.')
) {
  throw new Error(`Expected Floot SuperJSON deployment to pass. stdout=${floot.stdout} stderr=${floot.stderr}`);
}

const flootDynamic = await withMockDeployment('floot-dynamic', runChecker);
if (
  flootDynamic.code !== 0 ||
  !flootDynamic.stdout.includes('Public deployment frontend + backend parity passed.') ||
  !flootDynamic.stdout.includes('same-origin public script chunk')
) {
  throw new Error(`Expected dynamically chunked deployment to pass. stdout=${flootDynamic.stdout} stderr=${flootDynamic.stderr}`);
}

const wrongContract = await withMockDeployment('wrong-contract', runChecker);
const wrongContractOutput = wrongContract.stdout + '\n' + wrongContract.stderr;
if (
  wrongContract.code === 0 ||
  !wrongContractOutput.includes('Public backend contract version') ||
  !wrongContractOutput.includes(EXPECTED_CONTRACT_VERSION)
) {
  throw new Error(`Expected wrong deployment contract to fail clearly. stdout=${wrongContract.stdout} stderr=${wrongContract.stderr}`);
}

const staleBackend = await withMockDeployment('html-status', runChecker);
const staleOutput = staleBackend.stdout + '\n' + staleBackend.stderr;
if (staleBackend.code === 0 || !staleOutput.includes('instead of JSON') || !staleOutput.includes('may be stale')) {
  throw new Error(`Expected HTML API response to fail as stale. stdout=${staleBackend.stdout} stderr=${staleBackend.stderr}`);
}

const missingMarker = await withMockDeployment('missing-marker', runChecker);
const missingOutput = missingMarker.stdout + '\n' + missingMarker.stderr;
if (missingMarker.code === 0 || !missingOutput.includes('MISSING: Confirm matches & build')) {
  throw new Error(`Expected missing judge marker to fail clearly. stdout=${missingMarker.stdout} stderr=${missingMarker.stderr}`);
}

console.log('Deployment checker self-test passed.');
