import { readFile } from 'node:fs/promises';

const BASE_URL = (process.env.RESONANCE_BASE_URL || 'https://resonance-qloo.floot.app').replace(/\/$/, '');
const EXPECTED_QLOO_API_ORIGIN = (process.env.EXPECTED_QLOO_API_ORIGIN || 'https://hackathon.api.qloo.com').replace(/\/$/, '');
const EXPECTED_CONTRACT_VERSION = JSON.parse(
  await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'),
).version;

async function fetchJson(url) {
  const response = await fetch(url, {
    redirect:'follow',
    signal:AbortSignal.timeout(10000),
    headers:{ accept:'application/json', 'user-agent':'resonance-live-readiness-check/1.0' },
  });
  const bodyText = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${bodyText.slice(0,160)}`);
  const contentType = response.headers.get('content-type') || '';
  if (!/application\/json/i.test(contentType)) throw new Error(`${url} returned ${contentType || 'an unknown content type'} instead of JSON.`);
  const parsed = JSON.parse(bodyText);
  return parsed && typeof parsed === 'object' && parsed.json && typeof parsed.json === 'object' ? parsed.json : parsed;
}

async function fetchPublicStatus() {
  const failures = [];
  for (const path of ['/api/status','/_api/status']) {
    try { return { status:await fetchJson(BASE_URL + path), path }; }
    catch (error) { failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  throw new Error(failures.join(' | '));
}

let result;
try { result = await fetchPublicStatus(); }
catch (error) {
  console.error('FAIL: Could not read Resonance public status. ' + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
}

const status = result.status;
if (status.service !== 'resonance') {
  console.error(`FAIL: service=${JSON.stringify(status.service)}; expected "resonance".`);
  process.exit(1);
}
if (status.contractVersion !== EXPECTED_CONTRACT_VERSION) {
  console.error(`FAIL: contractVersion=${JSON.stringify(status.contractVersion)}; expected ${EXPECTED_CONTRACT_VERSION}.`);
  process.exit(1);
}
if (status.qlooApiOrigin !== EXPECTED_QLOO_API_ORIGIN) {
  console.error(`FAIL: qlooApiOrigin=${JSON.stringify(status.qlooApiOrigin)}; expected ${EXPECTED_QLOO_API_ORIGIN}.`);
  process.exit(1);
}

if (status.mode !== 'live' || status.qlooStatus !== 'ready' || status.qlooConnected !== true || status.qlooConfigured !== true) {
  console.error(
    `NOT READY: public deployment is current but live Qloo is unavailable via ${result.path}. ` +
    `mode=${status.mode}, qlooStatus=${status.qlooStatus}, qlooConfigured=${status.qlooConfigured}, qlooConnected=${status.qlooConnected}.`,
  );
  process.exit(2);
}

console.log(`Live Qloo readiness passed via ${result.path}: contract=${status.contractVersion}, qlooApiOrigin=${status.qlooApiOrigin}.`);
