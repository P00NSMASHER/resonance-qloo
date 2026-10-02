const BASE_URL = (process.env.RESONANCE_BASE_URL || 'https://resonance-qloo.floot.app').replace(/\/$/, '');

const requiredMarkers = [
  'How Qloo changed this plan',
  'Selection rule',
  'Plan signal #',
  'Additional evidence',
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

const html = await fetchText(BASE_URL);
const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(match => new URL(match[1], BASE_URL).toString());

if (!scriptSources.length) {
  console.error('FAIL: No public JavaScript bundle references were found.');
  process.exit(1);
}

const bundles = await Promise.all(scriptSources.map(fetchText));
const searchable = [html, ...bundles].join('\n');

const missing = requiredMarkers.filter(marker => !searchable.includes(marker));

console.log(`Checked ${scriptSources.length} public bundle(s) at ${BASE_URL}.`);
if (missing.length) {
  for (const marker of missing) console.error(`MISSING: ${marker}`);
  console.error('FAIL: Public deployment does not contain the current judge-evidence UI markers. Re-publish before final judging.');
  process.exit(1);
}

for (const marker of requiredMarkers) console.log(`FOUND: ${marker}`);
console.log('Public deployment feature parity passed.');
