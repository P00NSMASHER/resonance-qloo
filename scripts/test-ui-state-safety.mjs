import { readFile } from 'node:fs/promises';

const source = await readFile('src/App.tsx', 'utf8');

const requiredInvalidationBody = [
  "setResult(null);",
  "setSource(null);",
  "setError('');",
  "setCopied(false);",
  "setResolutionReview(null);",
];

const invalidateStart = source.indexOf('function invalidateGeneratedState()');
const invalidateEnd = source.indexOf('\n  function updateAnchor', invalidateStart);
if (invalidateStart < 0 || invalidateEnd < 0) throw new Error('Missing invalidateGeneratedState helper.');
const invalidateBody = source.slice(invalidateStart, invalidateEnd);
for (const marker of requiredInvalidationBody) {
  if (!invalidateBody.includes(marker)) throw new Error('invalidateGeneratedState no longer clears: ' + marker);
}

for (const fn of [
  'function updateAnchor(',
  'function updateAnchorType(',
  'function updateEnergy(',
  'function updateSetting(',
  'function updateDuration(',
  'function addAnchor(',
  'function removeAnchor(',
]) {
  const start = source.indexOf(fn);
  if (start < 0) throw new Error('Missing input mutation function: ' + fn);
  const end = source.indexOf('\n  }', start);
  const body = source.slice(start, end);
  if (!body.includes('invalidateGeneratedState();')) {
    throw new Error(fn + ' no longer invalidates generated/review state.');
  }
}

for (const marker of [
  'className="anchorRemove" disabled={loading}',
  '<select id="energy" value={energy} disabled={loading}',
  '<select id="setting" value={setting} disabled={loading}',
  '<select id="duration" value={durationMinutes} disabled={loading}',
]) {
  if (!source.includes(marker)) throw new Error('Live-request input locking marker missing: ' + marker);
}

const anchorTypeIndex = source.indexOf('className="anchorType"');
const anchorTypeWindow = source.slice(anchorTypeIndex, anchorTypeIndex + 450);
if (anchorTypeIndex < 0 || !anchorTypeWindow.includes('disabled={loading}')) {
  throw new Error('Anchor category select is editable during a live request.');
}

const anchorInputIndex = source.indexOf('id={`anchor-${index}`}');
const anchorInputWindow = source.slice(anchorInputIndex, anchorInputIndex + 350);
if (anchorInputIndex < 0 || !anchorInputWindow.includes('disabled={loading}')) {
  throw new Error('Anchor text input is editable during a live request.');
}

for (const marker of [
  "const [statusRefreshKey, setStatusRefreshKey] = useState(0);",
  "setQlooState('checking');",
  "setQlooApiOrigin('');",
  "}, [statusRefreshKey]);",
  "Retry Qloo verification",
  "setStatusRefreshKey(current => current + 1)",
  "const STATUS_REQUEST_TIMEOUT_MS = 12_000;",
  "window.setTimeout(() => controller.abort(), STATUS_REQUEST_TIMEOUT_MS);",
  "const LIVE_REQUEST_TIMEOUT_MS = 28_000;",
  "window.setTimeout(() => controller.abort(), LIVE_REQUEST_TIMEOUT_MS);",
  "const [qlooApiOrigin, setQlooApiOrigin] = useState('');",
  "import { hasVerifiedLiveProvenance } from './lib/liveProvenance';",
  "hasVerifiedLiveProvenance(data, qlooApiOrigin)",
  "qlooStateAfterRecommendationFailure(r.status, data?.error)",
  "if (nextQlooState) setQlooState(nextQlooState);",
  "setQlooState('degraded');",
  "Live Qloo provenance could not be verified.",
]) {
  if (!source.includes(marker)) throw new Error('Live provenance guard missing: ' + marker);
}

console.log('UI stale-state + provenance safety self-test passed.');
