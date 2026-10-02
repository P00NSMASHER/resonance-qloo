import { readFile } from 'node:fs/promises';

const BASE_URL = (process.env.RESONANCE_BASE_URL || 'https://resonance-qloo.floot.app').replace(/\/$/, '');
const EXPECTED_QLOO_API_ORIGIN = (process.env.EXPECTED_QLOO_API_ORIGIN || 'https://hackathon.api.qloo.com').replace(/\/$/, '');
const EXPECTED_CONTRACT_VERSION = JSON.parse(
  await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'),
).version;

const requiredMarkers = [
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

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
    headers: { 'user-agent': 'resonance-deployment-check/1.0' },
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'resonance-deployment-check/1.0',
    },
  });
  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${bodyText.slice(0,160)}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!/application\/json/i.test(contentType)) {
    throw new Error(
      `${url} returned ${contentType || 'an unknown content type'} instead of JSON. ` +
      'The public deployment may be stale or missing its API backend.',
    );
  }
  try {
    const parsed = JSON.parse(bodyText);
    return parsed && typeof parsed === 'object' && parsed.json && typeof parsed.json === 'object'
      ? parsed.json
      : parsed;
  } catch {
    throw new Error(`${url} returned invalid JSON despite content-type ${contentType}.`);
  }
}

async function fetchPublicStatus() {
  const failures = [];
  for (const path of ['/api/status','/_api/status']) {
    try {
      const status = await fetchJson(BASE_URL + path);
      return { status, path };
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(failures.join(' | '));
}

let statusResult;
try {
  statusResult = await fetchPublicStatus();
} catch (error) {
  console.error(
    'FAIL: Public backend status endpoint is not serving the current Resonance API contract. ' +
    (error instanceof Error ? error.message : String(error)),
  );
  process.exit(1);
}
const status = statusResult.status;
if (status.service !== 'resonance') {
  console.error(`FAIL: Public backend service marker is ${JSON.stringify(status.service)}, expected "resonance".`);
  process.exit(1);
}
if (status.contractVersion !== EXPECTED_CONTRACT_VERSION) {
  console.error(
    `FAIL: Public backend contract version is ${JSON.stringify(status.contractVersion)}, expected ${EXPECTED_CONTRACT_VERSION}.`,
  );
  process.exit(1);
}
if (status.qlooApiOrigin !== EXPECTED_QLOO_API_ORIGIN) {
  console.error(`FAIL: Public backend Qloo origin is ${JSON.stringify(status.qlooApiOrigin)}, expected ${EXPECTED_QLOO_API_ORIGIN}.`);
  process.exit(1);
}
if (!['preview','live'].includes(status.mode) || !['preview','ready','degraded','rate-limited'].includes(status.qlooStatus)) {
  console.error('FAIL: Public backend returned an invalid Qloo status contract: ' + JSON.stringify(status));
  process.exit(1);
}
console.log(`Public backend status passed via ${statusResult.path}: contract=${status.contractVersion}, mode=${status.mode}, qlooStatus=${status.qlooStatus}, qlooApiOrigin=${status.qlooApiOrigin}.`);

const html = await fetchText(BASE_URL);
const appOrigin = new URL(BASE_URL).origin;
const initialScripts = [...new Set(
  [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match => new URL(match[1], BASE_URL).toString())
    .filter(url => new URL(url).origin === appOrigin)
)];

if (!initialScripts.length) {
  console.error('FAIL: No same-origin public JavaScript bundle references were found.');
  process.exit(1);
}

function scriptReferences(source, parentUrl) {
  const urls = [];
  for (const match of source.matchAll(/["'`]([^"'`]+\.js)["'`]/g)) {
    const raw = match[1];
    let resolved;
    try {
      resolved = raw.startsWith('_assets/')
        ? new URL('/' + raw, BASE_URL)
        : new URL(raw, parentUrl);
    } catch {
      continue;
    }
    if (resolved.origin === appOrigin && resolved.pathname.startsWith('/_assets/')) urls.push(resolved.toString());
  }
  return urls;
}

const queue = [...initialScripts];
const visited = new Set();
const bundles = [];
while (queue.length && visited.size < 40) {
  const url = queue.shift();
  if (!url || visited.has(url)) continue;
  visited.add(url);
  try {
    const source = await fetchText(url);
    bundles.push(source);
    for (const child of scriptReferences(source, url)) {
      if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    }
  } catch (error) {
    console.warn(`WARN: Could not inspect script ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!bundles.length) {
  console.error('FAIL: Public page referenced scripts, but none could be inspected.');
  process.exit(1);
}

const searchable = [html, ...bundles].join('\n');
const missing = requiredMarkers.filter(marker => !searchable.includes(marker));

console.log(`Inspected ${bundles.length} same-origin public script chunk(s) at ${BASE_URL}.`);
if (missing.length) {
  for (const marker of missing) console.error(`MISSING: ${marker}`);
  console.error('FAIL: Public deployment does not contain the current judge-evidence UI markers. Re-publish before final judging.');
  process.exit(1);
}

for (const marker of requiredMarkers) console.log(`FOUND: ${marker}`);
console.log('Public deployment frontend + backend parity passed.');
