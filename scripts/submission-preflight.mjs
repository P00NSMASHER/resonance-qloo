import { access, readFile } from 'node:fs/promises';

const LIVE_URL = 'https://resonance-qloo.floot.app';
const EXPECTED_CONTRACT_VERSION = JSON.parse(
  await readFile('deployment-contract.json', 'utf8'),
).version;
const requiredFiles = [
  'LICENSE',
  'deployment-contract.json',
  'package-lock.json',
  'README.md',
  'openapi.yaml',
  'docs/JUDGING.md',
  'docs/SUBMISSION_EVIDENCE.md',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/DEVPOST_FIELDS.md',
  'docs/FLOOT_QLOO_CUTOVER.md',
  'docs/LIVE_QLOO_EVIDENCE.json',
  'SECURITY.md',
  'scripts/qloo-mcp-proof.mjs',
  'scripts/proof-redaction.mjs',
  'scripts/test-proof-redaction.mjs',
  'scripts/proof-environment.mjs',
  'scripts/test-proof-environment.mjs',
  'scripts/test-evidence-capture.mjs',
  'scripts/test-ui-state-safety.mjs',
  'scripts/test-deployment-checker.mjs',
  'scripts/check-secret-leaks.mjs',
  'scripts/test-secret-leaks.mjs',
  'src/lib/clientIdentity.ts',
  'src/lib/clientIdentity.test.ts',
  'src/lib/resolutionReviewToken.ts',
  'src/lib/resolutionReviewToken.test.ts',
  'src/App.tsx',
  'src/lib/recommendationResult.ts',
  'src/lib/liveProvenance.ts',
  'src/lib/liveProvenance.test.ts',
  'server/index.ts',
];

const failures = [];
const notes = [];

for (const path of requiredFiles) {
  try {
    await access(path);
  } catch {
    failures.push(`Missing required project artifact: ${path}`);
  }
}

try {
  const secretScanner = await readFile('scripts/check-secret-leaks.mjs', 'utf8');
  if (!secretScanner.includes('hack_[A-Za-z0-9]{20,}')) {
    failures.push('Repository secret scanner is missing the Qloo hackathon credential pattern.');
  }
  if (!secretScanner.includes('SECRET LEAK:')) {
    failures.push('Repository secret scanner no longer emits a clear failure marker.');
  }
} catch {}

try {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const lockRoot = packageLock?.packages?.[''] ?? {};
  const sameManifest = (left = {}, right = {}) =>
    JSON.stringify(Object.fromEntries(Object.entries(left).sort())) ===
    JSON.stringify(Object.fromEntries(Object.entries(right).sort()));

  for (const section of ['dependencies','devDependencies']) {
    for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
      if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
        failures.push(`package.json ${section} must pin ${name} to an exact version; found ${JSON.stringify(version)}.`);
      }
    }
  }
  if (packageLock?.lockfileVersion !== 3) {
    failures.push('package-lock.json is not using lockfileVersion 3.');
  }
  if (!sameManifest(packageJson.dependencies, lockRoot.dependencies)) {
    failures.push('package-lock.json runtime dependencies do not match package.json.');
  }
  if (!sameManifest(packageJson.devDependencies, lockRoot.devDependencies)) {
    failures.push('package-lock.json devDependencies do not match package.json.');
  }
  if (packageJson.engines?.node !== lockRoot.engines?.node) {
    failures.push('package-lock.json Node engine does not match package.json.');
  }
} catch (error) {
  failures.push(`Dependency lock verification failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const license = await readFile('LICENSE', 'utf8');
  if (!/MIT License/i.test(license)) failures.push('LICENSE is not recognizably MIT.');
} catch {}

try {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  if (!ci.includes('npm ci --no-audit --no-fund')) {
    failures.push('CI is not installing from the committed npm lockfile with npm ci.');
  }
  if (!ci.includes('id: deployment_parity') || !ci.includes('GITHUB_STEP_SUMMARY')) {
    failures.push('CI is not surfacing public deployment parity in the Actions summary.');
  }
} catch (error) {
  failures.push(`CI workflow could not be validated: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const gitignore = await readFile('.gitignore', 'utf8');
  if (!/^\.env$/m.test(gitignore) || !/^\.env\.\*$/m.test(gitignore)) {
    failures.push('.gitignore no longer blocks local dotenv credential files.');
  }
  if (!/^!\.env\.example$/m.test(gitignore)) {
    failures.push('.gitignore no longer explicitly preserves only the safe .env.example template.');
  }
} catch {}

try {
  const envExample = await readFile('.env.example', 'utf8');
  if (!envExample.includes('QLOO_API_BASE_URL=https://hackathon.api.qloo.com')) {
    failures.push('.env.example is not pinned to the Qloo Agentic Hackathon API origin.');
  }
  if (envExample.includes('QLOO_ALLOW_LOCAL_MOCK')) {
    failures.push('.env.example must not advertise the local Qloo mock escape hatch.');
  }
} catch {}

try {
  const qlooConfig = await readFile('src/lib/qlooConfig.ts', 'utf8');
  if (!qlooConfig.includes("DEFAULT_QLOO_API_BASE_URL = 'https://hackathon.api.qloo.com'")) {
    failures.push('Qloo runtime default is not the Agentic Hackathon API origin.');
  }
  if (!qlooConfig.includes("'hackathon.api.qloo.com'") || !qlooConfig.includes("'api.qloo.com'")) {
    failures.push('Qloo runtime is missing the trusted Qloo host allowlist.');
  }
  if (!qlooConfig.includes('allowLocalMock') || !qlooConfig.includes('isLoopbackHostname')) {
    failures.push('Qloo runtime is missing the explicit loopback-only local mock gate.');
  }
  if (!qlooConfig.includes("url.port !== '443'")) {
    failures.push('Qloo runtime is not enforcing the standard HTTPS port for trusted Qloo hosts.');
  }
} catch {}

try {
  const openapi = await readFile('openapi.yaml', 'utf8');
  if (!openapi.includes('selectedAffinityLabels')) {
    failures.push('OpenAPI contract is missing selectedAffinityLabels evidence.');
  }
  if (!openapi.includes('returnedAffinityCount')) {
    failures.push('OpenAPI contract is missing returnedAffinityCount evidence.');
  }
  if (!openapi.includes('resolutionMatch')) {
    failures.push('OpenAPI contract is missing exact-vs-top-result resolution evidence.');
  }
  if (!openapi.includes('exactResolutionCount') || !openapi.includes('topResultResolutionCount')) {
    failures.push('OpenAPI contract is missing resolution review counts.');
  }
  if (!openapi.includes('qlooApiOrigin') || !openapi.includes('apiOrigin')) {
    failures.push('OpenAPI contract is missing non-secret Qloo origin provenance.');
  }
  if (!openapi.includes('contractVersion')) {
    failures.push('OpenAPI status contract is missing the deployment contract version.');
  }
  if (!/Provenance:[\s\S]*?required:\s*\[[^\]]*contractVersion[^\]]*\]/.test(openapi)) {
    failures.push('OpenAPI live recommendation provenance is missing required contractVersion.');
  }
  if (!/ResolutionReviewRequired:[\s\S]*?required:\s*\[[^\]]*contractVersion[^\]]*\]/.test(openapi)) {
    failures.push('OpenAPI Qloo review response is missing required contractVersion.');
  }
  if (!openapi.includes('confirmedEntityIds') || !openapi.includes('QLOO_RESOLUTION_REVIEW_REQUIRED')) {
    failures.push('OpenAPI contract is missing the pre-taste entity-confirmation handshake.');
  }
  if (!openapi.includes('reviewToken') || !openapi.includes('expires after five minutes')) {
    failures.push('OpenAPI contract is missing the request-bound expiring Qloo review receipt.');
  }
  if (!openapi.includes('RequestContext:') || !openapi.includes('requestContext:')) {
    failures.push('OpenAPI contract is missing the normalized request-context receipt.');
  }
  if (!openapi.includes("name: refresh") || !openapi.includes("enum: ['1']")) {
    failures.push('OpenAPI status contract is missing the bounded Qloo re-verification query.');
  }
  if (!openapi.includes('invalidating any cached Qloo probe state, including ready')) {
    failures.push('OpenAPI Qloo refresh description no longer matches server behavior for cached ready state.');
  }
  if (!/required:\s*\[title, duration, action, why, affinityLabel\]/.test(openapi)) {
    failures.push('OpenAPI PlanItem no longer requires affinityLabel bridge evidence.');
  }
  if (!/const:\s*qloo-live/.test(openapi)) {
    failures.push('OpenAPI provenance no longer pins live responses to qloo-live.');
  }
} catch {}

try {
  const credentialStateDocs = [
    ['README.md', await readFile('README.md', 'utf8')],
    ['docs/KNOWN_LIMITATIONS.md', await readFile('docs/KNOWN_LIMITATIONS.md', 'utf8')],
    ['docs/SUBMISSION_EVIDENCE.md', await readFile('docs/SUBMISSION_EVIDENCE.md', 'utf8')],
    ['docs/FINALIZATION_RUNBOOK.md', await readFile('docs/FINALIZATION_RUNBOOK.md', 'utf8')],
    ['docs/DEVPOST_FIELDS.md', await readFile('docs/DEVPOST_FIELDS.md', 'utf8')],
  ];
  const staleCredentialPhrases = [
    'credential is still pending',
    'credential has been requested and is still pending',
    'has not yet arrived',
    'no key-delivery message has been found yet',
    'not yet connected to the Floot production environment',
    'public live-Qloo status remains preview',
  ];
  for (const [path, content] of credentialStateDocs) {
    for (const phrase of staleCredentialPhrases) {
      if (content.toLowerCase().includes(phrase.toLowerCase())) {
        failures.push(`${path} still claims the Qloo credential has not arrived: ${phrase}`);
      }
    }
  }
  if (!credentialStateDocs[0][1].includes('credential is connected to the Floot production environment')) {
    failures.push('README no longer records that the Qloo event credential is connected to Floot.');
  }
  for (const required of ['mode=live','qlooStatus=ready','qlooConfigured=true','qlooConnected=true']) {
    if (!credentialStateDocs[0][1].includes(required)) {
      failures.push(`README no longer records verified live-Qloo readiness: ${required}`);
    }
  }
} catch {}

try {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  if (packageJson.scripts?.['qloo:cutover:verify'] !== 'npm run deployment:check && npm run qloo:live:check -- --refresh') {
    failures.push('package.json qloo:cutover:verify no longer performs deployment parity plus forced Qloo readiness.');
  }
  if (packageJson.scripts?.['security:secrets:check'] !== 'node scripts/check-secret-leaks.mjs') {
    failures.push('package.json is missing the repository Qloo secret scan command.');
  }
  if (packageJson.scripts?.['security:secrets:selftest'] !== 'node scripts/test-secret-leaks.mjs') {
    failures.push('package.json is missing the repository secret scanner self-test command.');
  }
  if (!String(packageJson.scripts?.['submission:preflight'] || '').startsWith('npm run security:secrets:check && ')) {
    failures.push('submission:preflight no longer runs the repository secret scan first.');
  }
  if (!String(packageJson.scripts?.['submission:preflight:offline'] || '').startsWith('npm run security:secrets:check && ')) {
    failures.push('submission:preflight:offline no longer runs the repository secret scan first.');
  }
} catch {}

try {
  const readme = await readFile('README.md', 'utf8');
  if (!readme.includes(LIVE_URL)) failures.push('README does not include the public demo URL.');
  if (!readme.includes('https://devpost.com/software/resonance-nud9ek')) {
    failures.push('README does not include the Devpost project URL.');
  }
  if (!/illustrative demo/i.test(readme)) {
    failures.push('README does not clearly document the illustrative-demo provenance state.');
  }
} catch {}

try {
  const cutover = await readFile('docs/FLOOT_QLOO_CUTOVER.md', 'utf8');
  for (const required of [
    'QLOO_API_KEY',
    'QLOO_API_BASE_URL=https://hackathon.api.qloo.com',
    'npm run qloo:cutover:verify',
    'qloo:live:check -- --refresh',
    'npm run qloo:live:check',
    'mode=live',
    'qlooStatus=ready',
    'qlooConfigured=true',
    'qlooConnected=true',
    'RESONANCE_CONFIRMED_ENTITY_IDS',
    'RESONANCE_REVIEW_TOKEN',
  ]) {
    if (!cutover.includes(required)) {
      failures.push(`Floot live-Qloo cutover checklist is missing required verification content: ${required}`);
    }
  }
} catch {}

try {
  const liveEvidence = JSON.parse(await readFile('docs/LIVE_QLOO_EVIDENCE.json', 'utf8'));
  if (liveEvidence.http_status !== 200) {
    failures.push('Committed live Qloo evidence is not an HTTP 200 artifact.');
  }
  if (liveEvidence.response_summary?.provenance?.source !== 'qloo-live') {
    failures.push('Committed live Qloo evidence is not marked qloo-live.');
  }
  if (liveEvidence.response_summary?.provenance?.apiOrigin !== 'https://hackathon.api.qloo.com') {
    failures.push('Committed live Qloo evidence does not use the trusted hackathon API origin.');
  }
  if (liveEvidence.response_summary?.provenance?.contractVersion !== EXPECTED_CONTRACT_VERSION) {
    failures.push('Committed live Qloo evidence contract version does not match deployment-contract.json.');
  }
  if (liveEvidence.response_summary?.evidence?.resolvedAnchorCount !== 2) {
    failures.push('Committed live Qloo evidence no longer records the verified two-anchor run.');
  }
  if (liveEvidence.response_summary?.evidence?.selectedAffinityCount !== 4) {
    failures.push('Committed live Qloo evidence no longer records four selected Qloo signals.');
  }
  if (liveEvidence.response_summary?.evidence?.returnedAffinityCount !== 8) {
    failures.push('Committed live Qloo evidence no longer records eight returned Qloo signals.');
  }
  if (!Array.isArray(liveEvidence.response_summary?.plan) || liveEvidence.response_summary.plan.length !== 4) {
    failures.push('Committed live Qloo evidence no longer records a four-step plan.');
  }
  const serializedLiveEvidence = JSON.stringify(liveEvidence);
  if (/\\bhack_[A-Za-z0-9]{20,}\\b/.test(serializedLiveEvidence) || serializedLiveEvidence.includes('reviewToken')) {
    failures.push('Committed live Qloo evidence contains credential/review-receipt material.');
  }
} catch (error) {
  failures.push(`Could not validate committed live Qloo evidence artifact: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const limitations = await readFile('docs/KNOWN_LIMITATIONS.md', 'utf8');
  if (!limitations.includes('five-minute server-signed review receipt')) {
    failures.push('Known limitations no longer document the signed Qloo review receipt.');
  }
  if (!limitations.includes('IDs alone cannot authorize a non-exact match')) {
    failures.push('Known limitations no longer state that entity IDs alone cannot bypass Qloo review.');
  }
} catch {}

try {
  const judging = await readFile('docs/JUDGING.md', 'utf8');
  if (!judging.includes('## Verified live proof')) {
    failures.push('Judge guide no longer starts from the verified live-Qloo proof.');
  }
  if (!judging.includes('LIVE_QLOO_EVIDENCE.json')) {
    failures.push('Judge guide no longer links the committed live-Qloo artifact.');
  }
  if (!judging.includes('Live Qloo verified')) {
    failures.push('Judge guide no longer tells judges to confirm live Qloo readiness.');
  }
} catch {}

try {
  const devpostFields = await readFile('docs/DEVPOST_FIELDS.md', 'utf8');
  if (!devpostFields.includes('event-issued Qloo credential is securely connected')) {
    failures.push('Devpost field notes no longer record the connected Qloo credential state.');
  }
  if (!devpostFields.includes('deployment parity plus a fresh live-Qloo `ready` status are verified')) {
    failures.push('Devpost field notes no longer record verified live-Qloo readiness.');
  }
  if (!devpostFields.includes('public exact-match recommendation completed end-to-end')) {
    failures.push('Devpost field notes no longer record the verified public live-Qloo recommendation.');
  }
  if (!devpostFields.includes('docs/LIVE_QLOO_EVIDENCE.json')) {
    failures.push('Devpost field notes no longer reference the committed live-Qloo evidence artifact.');
  }
  if (!devpostFields.includes('live Devpost project description was refreshed after public Qloo verification')) {
    failures.push('Devpost field notes no longer record the post-verification project-description refresh.');
  }
} catch {}

try {
  const proof = await readFile('scripts/qloo-mcp-proof.mjs', 'utf8');
  if (!proof.includes('0.1.26')) {
    failures.push('Qloo MCP proof no longer enforces the event harness minimum version 0.1.26.');
  }
  if (!proof.includes('harness_version')) {
    failures.push('Qloo MCP proof artifact no longer records the harness version.');
  }
  if (!proof.includes('assertSecretAbsent')) {
    failures.push('Qloo MCP proof is missing the final serialized secret guard.');
  }
  if (!proof.includes('redactProof')) {
    failures.push('Qloo MCP proof is not using the shared redaction utility.');
  }
  if (!proof.includes('result.isError') || !proof.includes('tool_reported_error')) {
    failures.push('Qloo MCP proof is not treating MCP tool-level errors as failed proof.');
  }
  if (!proof.includes('buildQlooProofEnv')) {
    failures.push('Qloo MCP proof is not using the minimal subprocess environment builder.');
  }
  if (proof.includes('env: process.env')) {
    failures.push('Qloo MCP proof is exposing the full parent environment to the subprocess.');
  }
} catch {}

try {
  const proofEnvironment = await readFile('scripts/proof-environment.mjs', 'utf8');
  if (!proofEnvironment.includes('QLOO_API_KEY')) {
    failures.push('Proof subprocess environment is missing the event Qloo credential.');
  }
  for (const forbidden of ['OPENAI_API_KEY','GITHUB_TOKEN','AWS_SECRET_ACCESS_KEY','DATABASE_URL','QLOO_API_BASE_URL']) {
    if (proofEnvironment.includes(`'${forbidden}'`) || proofEnvironment.includes(`"${forbidden}"`)) {
      failures.push(`Proof subprocess environment allowlist contains forbidden variable: ${forbidden}`);
    }
  }
} catch {}

try {
  const redaction = await readFile('scripts/proof-redaction.mjs', 'utf8');
  if (!redaction.includes("value.includes(sensitive)")) {
    failures.push('Proof redaction no longer scrubs secret values under benign field names.');
  }
  if (!redaction.includes('serialized.includes(sensitive)')) {
    failures.push('Proof redaction no longer rejects leaked secrets in final serialized output.');
  }
} catch {}

try {
  const deploymentCheck = await readFile('scripts/check-deployment.mjs', 'utf8');
  if (!deploymentCheck.includes('EXPECTED_CONTRACT_VERSION') || !deploymentCheck.includes('status.contractVersion')) {
    failures.push('Deployment parity check is not enforcing the exact shared contract version.');
  }
  for (const marker of [
    'Qloo top match · review',
    'Qloo top match · confirmed',
    'Top matches confirmed',
    'Qloo API',
    'Request receipt',
    'No synthetic signal',
    'Interpretation limit',
    'aggregate cultural relationships',
    'QLOO_RESOLUTION_REVIEW_REQUIRED',
  ]) {
    if (!deploymentCheck.includes(marker)) {
      failures.push(`Deployment parity check is missing current UI marker: ${marker}`);
    }
  }
} catch {}

try {
  const clientIdentity = await readFile('src/lib/clientIdentity.ts', 'utf8');
  if (!clientIdentity.includes('forwardedValues.at(-1)')) {
    failures.push('Rate-limit identity is not using the proxy-nearest forwarded address.');
  }
  if (!clientIdentity.includes("createHash('sha256')")) {
    failures.push('Rate-limit identity is not hashing the network address before limiter storage.');
  }
  const server = await readFile('server/index.ts', 'utf8');
  if (!server.includes('rateLimitClientKey(')) {
    failures.push('Server is not using the tested minimized client-identity helper.');
  }
} catch {}

try {
  const reviewToken = await readFile('src/lib/resolutionReviewToken.ts', 'utf8');
  for (const marker of [
    "createHmac('sha256'",
    'resonance-resolution-review:v1',
    ".update(qlooApiOrigin)",
    ".update(deploymentContractVersion)",
    'timingSafeEqual',
    'RESOLUTION_REVIEW_TOKEN_TTL_MS = 5 * 60_000',
    'resolutionReviewSigningKey',
    'requestAnchorKey',
    'qlooEntityIdentity',
    'expiresAt <= now',
  ]) {
    if (!reviewToken.includes(marker)) {
      failures.push(`Qloo review receipt helper is missing integrity rule: ${marker}`);
    }
  }
} catch {}

try {
  const app = await readFile('src/App.tsx', 'utf8');
  if (!app.includes('data-deployment-contract={deploymentContract.version}')) {
    failures.push('Frontend is not embedding the shared deployment contract version.');
  }
  if (!app.includes('x?.contractVersion === deploymentContract.version') || !app.includes('!contractMatches')) {
    failures.push('Frontend is not failing closed when backend/frontend deployment contract versions differ.');
  }
  if (!app.includes('hasConsistentRecommendationResult')) {
    failures.push('Results UI is not validating live recommendation evidence consistency before rendering.');
  }
  if (!app.includes('className="signalCount"')) {
    failures.push('Results UI is missing selected-versus-returned signal counts.');
  }
  if (!app.includes('result.evidence.returnedAffinityCount')) {
    failures.push('Results UI is not using first-class returnedAffinityCount evidence.');
  }
  if (!app.includes('Selection rule')) {
    failures.push('Results UI is missing the Qloo signal selection rule.');
  }
  if (!app.includes('Plan signal #')) {
    failures.push('Results UI is missing numbered selected Qloo signals.');
  }
  if (!app.includes('Additional evidence')) {
    failures.push('Results UI no longer distinguishes supporting Qloo evidence.');
  }
  if (!app.includes('Qloo top match · review') || !app.includes('Review entity matches')) {
    failures.push('Results UI is missing Qloo top-result resolution review cues.');
  }
  if (!app.includes('Qloo match review required') || !app.includes('Confirm matches & build')) {
    failures.push('Results UI is missing the explicit pre-taste Qloo match confirmation flow.');
  }
  if (!app.includes('confirmedEntityIds')) {
    failures.push('Results UI is not sending explicitly confirmed Qloo entity IDs.');
  }
  if (!app.includes('resolutionReviewToken') || !app.includes('reviewToken:reviewBody.reviewToken') && !app.includes('{ reviewToken }')) {
    failures.push('Results UI is not returning the server-issued Qloo review receipt with confirmation.');
  }
  if (!app.includes('payloadHasMatchingRequestContext') || !app.includes('Qloo review response did not match the submitted session context')) {
    failures.push('Results UI is not binding review responses to the normalized submitted request receipt.');
  }
  if (!app.includes('<b>Qloo API</b>')) {
    failures.push('Results UI is missing live Qloo API origin provenance.');
  }
  if (!app.includes('<b>Request receipt</b>') || !app.includes('result.requestContext')) {
    failures.push('Results UI is missing the visible normalized request receipt.');
  }
  if (!app.includes('No synthetic signal')) {
    failures.push('Results UI is missing the sparse-evidence no-synthetic-signal disclosure.');
  }
  if (!app.includes('Interpretation limit') || !app.includes('aggregate cultural relationships')) {
    failures.push('Results UI is missing the aggregate-affinity interpretation limit.');
  }
  if (!app.includes('function invalidateGeneratedState()') || !app.includes('disabled={loading}')) {
    failures.push('Results UI is missing stale-state invalidation or live-request input locking.');
  }
  if (
    !app.includes("'/api/status?refresh=1'") ||
    !app.includes('Retry Qloo verification') ||
    !app.includes("qlooState === 'degraded' || qlooState === 'rate-limited'")
  ) {
    failures.push('Results UI manual Qloo retry is missing explicit re-verification or correct failure-state visibility.');
  }
  if (
    !app.includes("import { hasVerifiedLiveProvenance } from './lib/liveProvenance'") ||
    !app.includes('hasVerifiedLiveProvenance(data, qlooApiOrigin, deploymentContract.version)')
  ) {
    failures.push('Results UI is missing live Qloo provenance consistency verification.');
  }
  if (
    !app.includes('const requestContext: RecommendationRequestContext = {') ||
    !app.includes('typeUrn:anchorTypeUrn(item.type)') ||
    !app.includes('matchesRecommendationRequestContext(data, requestContext)') ||
    !app.includes('Live Qloo response did not match the submitted session context.')
  ) {
    failures.push('Results UI is missing live recommendation request-context binding.');
  }
  if (
    !app.includes('qlooStateAfterRecommendationFailure(r.status, data?.error)') ||
    !app.includes("setQlooState('degraded')")
  ) {
    failures.push('Results UI is not downgrading Qloo connection state after verified upstream/live-response failures.');
  }
} catch {}

try {
  const sessionExport = await readFile('src/lib/sessionExport.ts', 'utf8');
  if (!sessionExport.includes('selected Qloo signal #')) {
    failures.push('Session export is missing numbered selected Qloo signals.');
  }
  if (!sessionExport.includes('additional Qloo evidence')) {
    failures.push('Session export no longer distinguishes additional Qloo evidence.');
  }
  if (!sessionExport.includes('Resolution: Qloo top result — review')) {
    failures.push('Session export is missing Qloo top-result resolution review evidence.');
  }
  if (!sessionExport.includes('Selection evidence:')) {
    failures.push('Session export is missing selected-versus-returned evidence counts.');
  }
  if (!sessionExport.includes('returnedAffinityCount')) {
    failures.push('Session export is not preserving first-class returnedAffinityCount evidence.');
  }
  if (!sessionExport.includes('Qloo API origin:')) {
    failures.push('Session export is missing live Qloo API origin provenance.');
  }
  if (!sessionExport.includes('Deployment contract:')) {
    failures.push('Session export is missing live deployment-contract provenance.');
  }
  if (
    !sessionExport.includes('session.requestContext') ||
    !sessionExport.includes("'Submitted' : 'Illustrative'") ||
    !sessionExport.includes('request context:') ||
    !sessionExport.includes('anchors:')
  ) {
    failures.push('Session export is missing the normalized submitted request receipt.');
  }
  if (!sessionExport.includes('explicitly confirmed before taste analysis')) {
    failures.push('Session export is missing live top-result confirmation evidence.');
  }
  if (!sessionExport.includes('Signal reuse:')) {
    failures.push('Session export is missing the sparse-evidence signal-reuse disclosure.');
  }
  if (!sessionExport.includes('Interpretation limit: Qloo affinities are aggregate cultural signals')) {
    failures.push('Session export is missing the aggregate-affinity interpretation limit.');
  }
} catch {}

try {
  const server = await readFile('server/index.ts', 'utf8');
  if (!server.includes('contractVersion: deploymentContract.version')) {
    failures.push('Backend status is not exposing the shared deployment contract version.');
  }
  if ((server.match(/contractVersion:\s*deploymentContract\.version/g) || []).length < 4) {
    failures.push('Backend is not binding status, live recommendation provenance, and review responses to the shared deployment contract.');
  }
  if (!server.includes('ResolutionReviewRequiredError') || !server.includes("code: 'QLOO_RESOLUTION_REVIEW_REQUIRED'")) {
    failures.push('Server is missing the 409 Qloo resolution-confirmation response path.');
  }
  if (!server.includes('requestContext: error.requestContext')) {
    failures.push('Server review response is missing the normalized request receipt.');
  }
  if (
    !/resolutionReviewSigningKey\([\s\S]{0,180}deploymentContract\.version/.test(server) ||
    !server.includes('createResolutionReviewToken') ||
    !server.includes('verifyResolutionReviewToken') ||
    !server.includes('confirmationVerified')
  ) {
    failures.push('Server is missing request-bound Qloo review receipt minting/verification.');
  }
  if (!server.includes('qlooSearchCacheKey') || !server.includes('qlooTasteCacheKey')) {
    failures.push('Server is not using canonical Qloo request cache identities.');
  }
  if (
    !server.includes("process.env.QLOO_ALLOW_LOCAL_MOCK === '1'") ||
    !server.includes("process.env.NODE_ENV === 'development'") ||
    !server.includes("process.env.NODE_ENV === 'test'")
  ) {
    failures.push('Server local Qloo mock escape hatch is not restricted to explicit development/test mode.');
  }
  if (
    !server.includes('qlooProbeRefreshLimiter') ||
    !server.includes('processQlooProbeRefreshLimiter') ||
    !server.includes('if (cachedStatus)') ||
    server.includes("cachedStatus && cachedStatus !== 'ready'") ||
    !server.includes('qlooProbeCache.delete(keyFingerprint)') ||
    !server.includes("url.searchParams.get('refresh') === '1'")
  ) {
    failures.push('Server is missing bounded cache-bypassing Qloo verification retry semantics.');
  }
  if (
    !server.includes('qlooCredentialFingerprint(key)') ||
    !server.includes('credentialFingerprint') ||
    !server.includes('qlooSearchCacheKey(credentialFingerprint') ||
    !server.includes('qlooTasteCacheKey(credentialFingerprint')
  ) {
    failures.push('Qloo search/taste caches are not scoped to credential identity and canonical request keys.');
  }
  if (
    !server.includes('recommendationRequestValidationError(body)') ||
    !server.includes('return json(res, 400, { error: requestValidationError })')
  ) {
    failures.push('Server is not failing closed on out-of-contract recommendation requests before normalization/Qloo access.');
  }
  const validationIndex = server.indexOf('const requestValidationError = recommendationRequestValidationError(body)');
  const liveQuotaIndex = server.indexOf("const processLimit = processLiveLimiter.check('process')");
  if (validationIndex < 0 || liveQuotaIndex < 0 || validationIndex > liveQuotaIndex) {
    failures.push('Live Qloo quota is being charged before request validation.');
  }
} catch {}

try {
  const qlooClient = await readFile('src/lib/qlooClient.ts', 'utf8');
  if (!qlooClient.includes("redirect:'error'")) {
    failures.push('Qloo client is not refusing redirects on credential-bearing requests.');
  }
  if (
    !qlooClient.includes("feature.explainability") ||
    !qlooClient.includes("[400, 422]") ||
    !qlooClient.includes('explainabilityUnsupported') ||
    !qlooClient.includes("url.searchParams.has('feature.explainability')")
  ) {
    failures.push('Qloo client is missing the explainability-specific compatibility fallback.');
  }
  if (qlooClient.includes('public readonly responseDetail')) {
    failures.push('Qloo client is retaining raw upstream validation detail on public error objects.');
  }
} catch {}

try {
  const requestNormalization = await readFile('src/lib/requestNormalization.ts', 'utf8');
  for (const marker of [
    'recommendationRequestValidationError',
    'ALLOWED_REQUEST_KEYS',
    'body.anchors.length > 4',
    'ALLOWED_ENERGY.has(body.energy)',
    'ALLOWED_SETTING.has(body.setting)',
    'ALLOWED_DURATION_MINUTES.has(body.durationMinutes)',
    'confirmedEntityIds must contain at most 4',
    'reviewToken must contain 1–128 characters',
  ]) {
    if (!requestNormalization.includes(marker)) {
      failures.push(`Public recommendation request validation is missing contract rule: ${marker}`);
    }
  }
} catch {}

try {
  const recommendationResult = await readFile('src/lib/recommendationResult.ts', 'utf8');
  for (const marker of [
    'returnedAffinityCount !== affinities.length',
    'exactResolutionCount',
    'topResultResolutionCount',
    'selectedAffinityLabels',
    'planLabels.size !== selectedLabels.size',
    'const PLAN_TITLES',
    'const PLAN_DURATIONS',
    'const expectedPlanLabels',
    'const expectedAnchorName',
    'matchesRecommendationRequestContext',
    'requestAnchorKey',
    "const STAGES = ['resolve','evaluate','compose','explain']",
  ]) {
    if (!recommendationResult.includes(marker)) {
      failures.push(`Live recommendation result validator is missing integrity rule: ${marker}`);
    }
  }
} catch {}

try {
  const qlooCacheKey = await readFile('src/lib/qlooCacheKey.ts', 'utf8');
  if (
    !qlooCacheKey.includes('normalizedRequestQuery') ||
    !qlooCacheKey.includes("entityIds.map(qlooEntityIdentity).join(',')")
  ) {
    failures.push('Qloo cache-key helper is missing canonical search/entity identity.');
  }
  if (qlooCacheKey.includes('.sort()')) {
    failures.push('Qloo taste cache key must preserve resolved entity order rather than sorting it.');
  }
} catch {}

try {
  const recommendationService = await readFile('src/lib/recommendationService.ts', 'utf8');
  if (!recommendationService.includes('ResolutionReviewRequiredError')) {
    failures.push('Recommendation service no longer blocks taste analysis pending Qloo match confirmation.');
  }
  if (!recommendationService.includes('confirmedEntityIds')) {
    failures.push('Recommendation service no longer checks explicit confirmed Qloo entity IDs.');
  }
  if (!recommendationService.includes('confirmationVerified')) {
    failures.push('Recommendation service allows Qloo ID confirmation without a verified review receipt.');
  }
  if (!recommendationService.includes('recommendationRequestContext') || !recommendationService.includes('requestContext,')) {
    failures.push('Recommendation service is missing the normalized request receipt.');
  }
} catch {}

try {
  const capture = await readFile('scripts/capture-live-evidence.mjs', 'utf8');
  if (!capture.includes('QLOO_TRUSTED_BASE_URL')) {
    failures.push('Live evidence capture is not bound to a trusted Qloo origin.');
  }
  if (
    !capture.includes('expectedContractVersion') ||
    !capture.includes('status.body.contractVersion') ||
    !capture.includes('provenance?.contractVersion') ||
    !capture.includes('deployment_contract_version')
  ) {
    failures.push('Live evidence capture is not bound to the shared deployment contract version.');
  }
  if (!capture.includes('provenance?.apiOrigin') && !capture.includes('provenance.apiOrigin')) {
    failures.push('Live evidence capture is not checking recommendation Qloo origin provenance.');
  }
  if (!capture.includes('confirmation_receipt')) {
    failures.push('Live evidence capture is missing the explicit Qloo confirmation receipt.');
  }
  if (!capture.includes('reviewToken,') || !capture.includes('credential or ephemeral review receipt')) {
    failures.push('Live evidence capture final serialization guard is not protecting the ephemeral review receipt.');
  }
  if (!capture.includes('RESONANCE_REVIEW_TOKEN') || !capture.includes('reviewTokenUsed')) {
    failures.push('Live evidence capture is not requiring/recording use of the Qloo review receipt.');
  }
  if (!capture.includes('unconfirmedTopResults')) {
    failures.push('Live evidence capture is not rejecting unconfirmed top-result matches.');
  }
  if (!capture.includes('Resolution review count mismatch')) {
    failures.push('Live evidence capture is not validating resolution review counts.');
  }
  if (!capture.includes('requestContextMatches') || !capture.includes('did not match the evidence-capture request context')) {
    failures.push('Live evidence capture is not binding artifacts to the normalized request receipt.');
  }
  if (!capture.includes('Qloo review response deployment contract mismatch')) {
    failures.push('Live evidence capture is not rejecting stale-contract Qloo review receipts.');
  }
  if (!capture.includes('interpretation_limit') || !capture.includes('aggregate cultural signals')) {
    failures.push('Live evidence capture is missing the responsible Qloo interpretation limit.');
  }
  if (!capture.includes('human_review') || !capture.includes('accept, modify, reorder, or reject')) {
    failures.push('Live evidence capture is missing explicit facilitator-control evidence.');
  }
} catch {}

if (!process.argv.includes('--offline')) {
  try {
    const response = await fetch(LIVE_URL, { redirect:'follow', signal:AbortSignal.timeout(8000) });
    if (!response.ok) failures.push(`Public demo returned HTTP ${response.status}.`);
    else notes.push(`Public demo reachable: HTTP ${response.status}.`);
  } catch (error) {
    failures.push(`Public demo could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}

notes.push('Demo video is not required by the current Qloo Devpost submission requirements.');
notes.push('Final submission must remain blocked until the event-issued Qloo credential is connected and end-to-end live Qloo use is verified.');

for (const note of notes) console.log('NOTE:', note);

if (failures.length) {
  for (const failure of failures) console.error('FAIL:', failure);
  process.exit(1);
}

console.log('Submission preflight passed.');
