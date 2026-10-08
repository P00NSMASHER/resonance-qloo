import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const snapshotRoot = new URL('../floot-production/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', snapshotRoot), 'utf8'));
const deployment = JSON.parse(await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'));
const failures = [];

const readSnapshot = path => readFile(new URL(path, snapshotRoot), 'utf8');
const readRepo = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
// Git stores these text snapshots with LF endings even when a Windows checkout
// presents them as CRLF. Hash the canonical Git text so exact-source parity is
// stable across developer platforms without accepting any content change.
const canonicalGitText = body => body.replace(/\r\n/g, '\n');
const gitBlobSha = body => {
  const canonicalBody = canonicalGitText(body);
  return createHash('sha1')
  .update(`blob ${Buffer.byteLength(canonicalBody, 'utf8')}\0`)
  .update(canonicalBody, 'utf8')
  .digest('hex');
};

if (manifest.flootProjectId !== '49082a23-f25f-41f4-a147-f908c8dcc860') failures.push('Unexpected Floot project ID.');
if (manifest.flootProjectVersion !== '1791485788167') failures.push('Unexpected Floot project version.');
if (manifest.publishedUrl !== 'https://resonance-qloo.floot.app') failures.push('Unexpected Floot published URL.');
if (manifest.qlooApiOrigin !== 'https://hackathon.api.qloo.com') failures.push('Unexpected Floot Qloo API origin.');
if (manifest.deploymentContractVersion !== deployment.version) failures.push('Floot snapshot contract version differs from deployment-contract.json.');
if (manifest.liveVerification?.flootProjectVersion !== manifest.flootProjectVersion) failures.push('Live Floot verification receipt version differs from the snapshot version.');
if (manifest.liveVerification?.exactFileCount !== manifest.files.length) failures.push('Live Floot verification receipt file count differs from the manifest file count.');
if (manifest.liveVerification?.directComparisonStatus !== '29/29 exact') failures.push('Live Floot verification receipt is missing the 29/29 exact direct-comparison status.');

for (const entry of manifest.files ?? []) {
  const body = await readSnapshot(entry.path);
  const canonicalBody = canonicalGitText(body);
  if (canonicalBody.length !== entry.sourceCharCount) failures.push(`Exact Floot snapshot character-count mismatch: ${entry.path}`);
  if (/output capped at/i.test(canonicalBody) || /^\s+\d+\s*$/m.test(canonicalBody)) failures.push(`Capture artifact found in exact Floot snapshot: ${entry.path}`);
  if (gitBlobSha(body) !== entry.gitBlobSha) failures.push(`Exact Floot snapshot hash mismatch: ${entry.path}`);
}

const prodRecommend = await readSnapshot('endpoints/recommend_POST.ts');
const prodRecommendSchema = await readSnapshot('endpoints/recommend_POST.schema.ts');
const prodStatus = await readSnapshot('endpoints/status_GET.ts');
const prodStatusSchema = await readSnapshot('endpoints/status_GET.schema.ts');
const prodLogic = await readSnapshot('helpers/qlooSessionLogic.tsx');
const prodPage = await readSnapshot('pages/_index.tsx');
const prodCss = await readSnapshot('pages/_index.module.css');
const prodStudySchema = await readSnapshot('endpoints/study-response_POST.schema.ts');
const prodStudyEndpoint = await readSnapshot('endpoints/study-response_POST.ts');
const prodStudyPage = await readSnapshot('pages/study.tsx');

const canonicalClient = await readRepo('src/lib/qlooClient.ts');
const canonicalReview = await readRepo('src/lib/resolutionReviewToken.ts');
const canonicalServer = await readRepo('server/index.ts');
const canonicalPlanner = await readRepo('src/lib/agentPlanner.ts');
const canonicalLogic = await readRepo('src/lib/qlooLogic.ts');
const canonicalApp = await readRepo('src/App.tsx');
const canonicalDelta = await readRepo('src/lib/qlooDelta.ts');
const canonicalStudy = await readRepo('src/lib/studyResponse.ts');
const prodStudyTiming = await readSnapshot('helpers/studyTiming.tsx');
const prodStudyCss = await readSnapshot('pages/study.module.css');
const portableTiming = await readRepo('src/lib/studyTiming.ts');
if (prodStudyTiming !== portableTiming) failures.push('Portable and Floot timing helpers diverged.');
for(const needle of ['studyTiming.finish','outcome.reset','setTimerError','window.open','tab.opener=null','Your browser blocked','role="alert"']){
  if(!prodStudyPage.includes(needle)) failures.push('Study participant measurement or blocked-tab handling missing: '+needle);
}
for(const needle of ['Cultural Atlas','timerError','openHelp','.brand img','prefers-reduced-motion']){
  if(!prodStudyCss.includes(needle)) failures.push('Branded study page CSS missing: '+needle);
}


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

requireBoth('Qloo activity-relevant genre filtering', prodRecommend,
  ['url.searchParams.set("filter.tag.types",tagType)','urn:tag:genre:music','urn:tag:genre:media','balanceGenreAffinities'],
  canonicalClient,
  ["url.searchParams.set('filter.tag.types', tagType)","urn:tag:genre:music","urn:tag:genre:media"]);
requireBoth('Qloo family evidence integrity', prodLogic,
  ['balanceGenreAffinities','score:item.score','rank:output.length+1'],
  canonicalLogic,
  ['balanceGenreAffinities','score:item.score','rank:result.length + 1']);
requireBoth('ranked genre family provenance', prodRecommend,
  ['evidenceBasis:"ranked-order" as const','meanNormalizedScore:null'],
  canonicalPlanner,
  ['rankedGenreFamilies','!rankedGenreFamilies && scored.length >= 3']);

requireBoth('signed review receipt', prodRecommend,
  ['createReviewToken','verifyReviewToken','5 * 60_000','QLOO_RESOLUTION_REVIEW_REQUIRED'],
  canonicalReview,
  ['createResolutionReviewToken','verifyResolutionReviewToken','5 * 60_000']);

requireBoth('credential-scoped caching', prodRecommend,
  ['SEARCH_TTL_MS = 10 * 60_000','TASTE_TTL_MS = 5 * 60_000','credentialFingerprint','cachedQloo'],
  canonicalServer,
  ['searchCache = createTtlCache<unknown>(10 * 60_000','tasteCache = createTtlCache<unknown>(5 * 60_000','qlooCredentialFingerprint','qlooSearchCacheKey','qlooTasteCacheKey']);

for (const needle of ['confirmedEntityIds','reviewToken','requestContext','selectedAffinityCount','selectedAffinityLabels','returnedAffinityCount','topResultResolutionCount']) {
  if (!prodRecommendSchema.includes(needle)) failures.push(`Production recommendation schema missing evidence/review field: ${needle}`);
}
for (const needle of ['qlooConfigured','qlooConnected','qlooStatus','qlooApiOrigin','contractVersion','mode']) {
  if (!prodStatus.includes(needle) || !prodStatusSchema.includes(needle)) failures.push(`Production status contract missing: ${needle}`);
}
for (const needle of [
  'contractVersion:"2026-10-02.review-origin-v1"',
  'apiOrigin:"https://hackathon.api.qloo.com"',
  'evidenceBasis:usingScores ? "normalized-score" as const : "ranked-order" as const',
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

for (const needle of ['Live Qloo verified','Qloo match review required','Confirm matches & build','Your favorites','What Qloo discovered','Your session','How Qloo changed this session','Without Qloo · anchor-only baseline','With Qloo · live taste graph','View evidence &amp; audit trail','selected discoveries not named in the inputs','Plan signal #','Additional evidence','Interpretation limit']) {
  if (!prodPage.includes(needle)) failures.push(`Production judge UI missing: ${needle}`);
}
for (const needle of ['qlooUi.liveReady','Build with live Qloo','Qloo match review required','Confirm matches & build','Your favorites','What Qloo discovered','Your session','How Qloo changed this session','Without Qloo · anchor-only baseline','With Qloo · live taste graph','View evidence &amp; audit trail','selected discoveries not named in the inputs','Plan signal #','Additional evidence','Interpretation limit']) {
  if (!canonicalApp.includes(needle)) failures.push(`Canonical judge UI missing: ${needle}`);
}
requireBoth('Resonance branded first screen', prodPage,
  ['Culture becomes <em>connection.</em>','heroVisual','heroArtwork','brandMark','build-session'],
  canonicalApp,
  ['Culture becomes <em>connection.</em>','heroVisual','brandIcon','build-session']);
if (!prodCss.includes('Cultural Atlas brand system') ||
    !prodCss.includes('prefers-reduced-motion') ||
    !prodCss.includes('heroVisual') ||
    !canonicalApp.includes('/brand/resonance-cultural-atlas.png') ||
    !canonicalApp.includes('/brand/resonance-connection-emblem.png')) {
  failures.push('Resonance premium responsive brand and asset reference parity incomplete.');
}
requireBoth('Qloo session archetypes', prodLogic,
  ['selectSessionArchetype','Memory & conversation','Sensory & social','Creative participation','Familiar opening','Sensory welcome','Creative spark','activityCue(affinityLabel)','Facilitator cue:'],
  canonicalLogic,
  ['selectSessionArchetype','Memory & conversation','Sensory & social','Creative participation','Familiar opening','Sensory welcome','Creative spark','activityCue(item.affinityLabel)','Facilitator cue:']);
requireBoth('facilitator review controls', prodPage,
  ['Keep','Modify','Replace','All activity decisions complete','activityDecisions'],
  canonicalApp,
  ['Keep','Modify','Replace','All activity decisions complete','activityDecisions']);
requireBoth('Qloo delta comparison', prodPage,
  ['literalBaselineAction','selectedSignalsNotNamedInInputs','activitiesInfluencedCount'],
  canonicalDelta,
  ['buildAnchorOnlyBaseline','selectedSignalsNotNamedInInputs','activitiesInfluencedCount']);
for (const needle of ['@media(max-width:1000px)','@media(max-width:650px)','.evidenceBridge','.planGrid','.reviewCard']) {
  if (!prodCss.includes(needle)) failures.push(`Production responsive CSS missing: ${needle}`);
}


requireBoth('anonymous study route', prodStudyEndpoint,
  ['RESONANCE_STUDY_RESPONSE','studyVersion:STUDY_VERSION','Too many study submissions','feedbackWithheldFromLogs:true','receipt:input'],
  canonicalServer,
  ['RESONANCE_STUDY_RESPONSE','studyVersion:input.studyVersion','Too many study submissions','feedbackWithheldFromLogs:true','receipt:input']);

for (const needle of ['noindex,nofollow','Anonymous validation study','Plan it without Resonance','Do the same task with Resonance','anonymous aggregate use','Download anonymous study receipt','withheld from server logs']) {
  if (!prodStudyPage.includes(needle)) failures.push(`Production active-study page missing integrity marker: ${needle}`);
}
if (!canonicalServer.includes("url.pathname === '/api/study-response'")) failures.push('Canonical server is missing the active study-response route.');

if (failures.length) {
  failures.forEach(failure => console.error('FAIL:', failure));
  process.exit(1);
}

console.log(`Floot production parity passed: version ${manifest.flootProjectVersion}; ${manifest.files.length} exact content-addressed runtime files.`);
