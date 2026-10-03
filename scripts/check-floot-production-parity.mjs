import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const snapshotRoot = new URL('../floot-production/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', snapshotRoot), 'utf8'));
const deployment = JSON.parse(await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'));
const failures = [];

const readSnapshot = path => readFile(new URL(path, snapshotRoot), 'utf8');
const readRepo = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const gitBlobSha = body => createHash('sha1')
  .update(`blob ${Buffer.byteLength(body, 'utf8')}\0`)
  .update(body, 'utf8')
  .digest('hex');

if (manifest.flootProjectId !== '49082a23-f25f-41f4-a147-f908c8dcc860') failures.push('Unexpected Floot project ID.');
if (manifest.flootProjectVersion !== '1791023061990') failures.push('Unexpected Floot project version.');
if (manifest.publishedUrl !== 'https://resonance-qloo.floot.app') failures.push('Unexpected Floot published URL.');
if (manifest.qlooApiOrigin !== 'https://hackathon.api.qloo.com') failures.push('Unexpected Floot Qloo API origin.');
if (manifest.deploymentContractVersion !== deployment.version) failures.push('Floot snapshot contract version differs from deployment-contract.json.');

for (const entry of manifest.files ?? []) {
  const body = await readSnapshot(entry.path);
  if (gitBlobSha(body) !== entry.gitBlobSha) failures.push(`Exact Floot snapshot hash mismatch: ${entry.path}`);
}

const prodRecommend = await readSnapshot('endpoints/recommend_POST.ts');
const prodRecommendSchema = await readSnapshot('endpoints/recommend_POST.schema.ts');
const prodStatus = await readSnapshot('endpoints/status_GET.ts');
const prodStatusSchema = await readSnapshot('endpoints/status_GET.schema.ts');
const prodLogic = await readSnapshot('helpers/qlooSessionLogic.tsx');
const prodPage = await readSnapshot('pages/_index.tsx');
const prodCss = await readSnapshot('pages/_index.module.css');

const canonicalClient = await readRepo('src/lib/qlooClient.ts');
const canonicalReview = await readRepo('src/lib/resolutionReviewToken.ts');
const canonicalServer = await readRepo('server/index.ts');
const canonicalPlanner = await readRepo('src/lib/agentPlanner.ts');
const canonicalApp = await readRepo('src/App.tsx');

const requireBoth = (name, prodText, prodNeedles, canonicalText, canonicalNeedles) => {
  for (const needle of prodNeedles) if (!prodText.includes(needle)) failures.push(`Production missing ${name}: ${needle}`);
  for (const needle of canonicalNeedles) if (!canonicalText.includes(needle)) failures.push(`Canonical source missing ${name}: ${needle}`);
};

requireBoth('Qloo search contract', prodRecommend,
  ['new URL("/search",qlooSessionLogic.apiOrigin)','url.searchParams.set("take","5")','url.searchParams.set("sort_by","match")','url.searchParams.append("types",anchor.typeUrn)'],
  canonicalClient,
  ["new URL('/search', this.baseUrl)","url.searchParams.set('take', '5')","url.searchParams.set('sort_by', 'match')","url.searchParams.append('types', entityType)"]);

requireBoth('Qloo insights contract', prodRecommend,
  ['new URL("/v2/insights",qlooSessionLogic.apiOrigin)','url.searchParams.set("filter.type","urn:tag")','url.searchParams.set("signal.interests.entities"','url.searchParams.set("take","8")','url.searchParams.set("feature.explainability","true")'],
  canonicalClient,
  ["new URL('/v2/insights', this.baseUrl)","url.searchParams.set('filter.type', 'urn:tag')","url.searchParams.set('signal.interests.entities'","url.searchParams.set('take', '8')","url.searchParams.set('feature.explainability', 'true')"]);

requireBoth('signed review receipt', prodRecommend,
  ['createReviewToken','verifyReviewToken','5 * 60_000','QLOO_RESOLUTION_REVIEW_REQUIRED'],
  canonicalReview,
  ['createResolutionReviewToken','verifyResolutionReviewToken','5 * 60_000']);

requireBoth('credential-scoped caching', prodRecommend,
  ['SEARCH_TTL_MS = 10 * 60_000','TASTE_TTL_MS = 5 * 60_000','credentialFingerprint','cachedQloo'],
  canonicalServer,
  ['searchCache = createTtlCache<unknown>(10 * 60_000','tasteCache = createTtlCache<unknown>(5 * 60_000','qlooCredentialFingerprint','qlooSearchCacheKey','qlooTasteCacheKey']);

for (const needle of ['confirmedEntityIds','reviewToken','requestContext','selectedAffinityCount','returnedAffinityCount','topResultResolutionCount']) {
  if (!prodRecommendSchema.includes(needle)) failures.push(`Production recommendation schema missing evidence/review field: ${needle}`);
}
for (const needle of ['qlooConfigured','qlooConnected','qlooStatus','qlooApiOrigin','contractVersion','mode']) {
  if (!prodStatus.includes(needle) || !prodStatusSchema.includes(needle)) failures.push(`Production status contract missing: ${needle}`);
}
for (const needle of [
  'contractVersion:"2026-10-02.review-origin-v1"',
  'apiOrigin:"https://hackathon.api.qloo.com"',
  'evidenceBasis:usingScores ? "normalized-score" as const : "ranked-order" as const',
  'selectedAffinityLabels',
  'resolutionMatch',
]) if (!prodLogic.includes(needle)) failures.push(`Production shared logic missing: ${needle}`);

for (const needle of ['selectedAffinityLabels','normalized-score','ranked-order','topResultResolutionCount']) {
  if (!canonicalPlanner.includes(needle)) failures.push(`Canonical planner missing evidence invariant: ${needle}`);
}

for (const needle of ['source:"qloo-live"','apiOrigin:qlooSessionLogic.apiOrigin','contractVersion:qlooSessionLogic.contractVersion']) {
  if (!prodRecommend.includes(needle)) failures.push(`Production provenance missing: ${needle}`);
}
for (const needle of ["source: 'qloo-live'","apiOrigin: QLOO_BASE_URL","contractVersion: deploymentContract.version"]) {
  if (!canonicalServer.includes(needle)) failures.push(`Canonical provenance missing: ${needle}`);
}

for (const needle of ['Live Qloo verified','Qloo match review required','Confirm matches & build','How Qloo changed this plan','Plan signal #','Additional evidence','Interpretation limit']) {
  if (!prodPage.includes(needle)) failures.push(`Production judge UI missing: ${needle}`);
  if (!canonicalApp.includes(needle)) failures.push(`Canonical judge UI missing: ${needle}`);
}
for (const needle of ['@media(max-width:1000px)','@media(max-width:650px)','.evidenceBridge','.planGrid','.reviewCard']) {
  if (!prodCss.includes(needle)) failures.push(`Production responsive CSS missing: ${needle}`);
}

if (failures.length) {
  failures.forEach(failure => console.error('FAIL:', failure));
  process.exit(1);
}

console.log(`Floot production parity passed: version ${manifest.flootProjectVersion}; ${manifest.files.length} exact content-addressed runtime files.`);
