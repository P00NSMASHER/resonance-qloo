const BASE_URL = (process.env.RESONANCE_BASE_URL || 'https://resonance-qloo.floot.app').replace(/\/$/, '');
const EXPECTED_QLOO_API_ORIGIN = (process.env.EXPECTED_QLOO_API_ORIGIN || 'https://hackathon.api.qloo.com').replace(/\/$/, '');

const requiredMarkers = [
  'How Qloo changed this plan',
  'Selection rule',
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
    return JSON.parse(bodyText);
  } catch {
    throw new Error(`${url} returned invalid JSON despite content-type ${contentType}.`);
  }
}

let status;
try {
  status = await fetchJson(BASE_URL + '/api/status');
} catch (error) {
  console.error(
    'FAIL: Public backend status endpoint is not serving the current Resonance API contract. ' +
    (error instanceof Error ? error.message : String(error)),
  );
  process.exit(1);
}
if (status.service !== 'resonance') {
  console.error(`FAIL: Public backend service marker is ${JSON.stringify(status.service)}, expected "resonance".`);
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
console.log(`Public backend status passed: mode=${status.mode}, qlooStatus=${status.qlooStatus}, qlooApiOrigin=${status.qlooApiOrigin}.`);

const html = await fetchText(BASE_URL);
const scriptSources = [...new Set(
  [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match => new URL(match[1], BASE_URL).toString())
)];

if (!scriptSources.length) {
  console.error('FAIL: No public JavaScript bundle references were found.');
  process.exit(1);
}

const bundleResults = await Promise.allSettled(scriptSources.map(fetchText));
const bundles = [];
for (let index = 0; index < bundleResults.length; index += 1) {
  const result = bundleResults[index];
  if (result.status === 'fulfilled') bundles.push(result.value);
  else console.warn(`WARN: Could not inspect script ${scriptSources[index]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
}

if (!bundles.length) {
  console.error('FAIL: Public page referenced scripts, but none could be inspected.');
  process.exit(1);
}

const searchable = [html, ...bundles].join('\n');
const missing = requiredMarkers.filter(marker => !searchable.includes(marker));

console.log(`Inspected ${bundles.length} of ${scriptSources.length} public script(s) at ${BASE_URL}.`);
if (missing.length) {
  for (const marker of missing) console.error(`MISSING: ${marker}`);
  console.error('FAIL: Public deployment does not contain the current judge-evidence UI markers. Re-publish before final judging.');
  process.exit(1);
}

for (const marker of requiredMarkers) console.log(`FOUND: ${marker}`);
console.log('Public deployment frontend + backend parity passed.');
