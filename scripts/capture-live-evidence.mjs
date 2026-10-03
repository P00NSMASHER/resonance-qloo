import { readFile } from 'node:fs/promises';

const base = (process.env.RESONANCE_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const trustedQlooOrigin = (process.env.QLOO_TRUSTED_BASE_URL || 'https://hackathon.api.qloo.com').replace(/\/$/, '');
const expectedContractVersion = JSON.parse(
  await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'),
).version;
const anchors = ['Ella Fitzgerald', "Singin' in the Rain", 'Italian food'];
const confirmedEntityIds = (process.env.RESONANCE_CONFIRMED_ENTITY_IDS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
  .slice(0,4);
const reviewToken = (process.env.RESONANCE_REVIEW_TOKEN || '').trim();

const expectedRequestContext = {
  anchors:anchors.map(query => ({ query })),
  energy:'calm',
  setting:'small-group',
  durationMinutes:45,
};

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

function requestContextMatches(payload) {
  const context = payload?.requestContext;
  if (
    !context ||
    !Array.isArray(context.anchors) ||
    context.anchors.length !== expectedRequestContext.anchors.length ||
    context.energy !== expectedRequestContext.energy ||
    context.setting !== expectedRequestContext.setting ||
    context.durationMinutes !== expectedRequestContext.durationMinutes
  ) return false;

  return context.anchors.every((item,index) =>
    item &&
    normalizeText(item.query) === normalizeText(expectedRequestContext.anchors[index].query) &&
    item.typeUrn === undefined
  );
}

async function getJson(path, init) {
  const response = await fetch(base + path, {
    ...init,
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const status = await getJson('/api/status');
if (!status.response.ok) {
  throw new Error(`Status endpoint failed: HTTP ${status.response.status}`);
}
if (!status.body.qlooConnected) {
  throw new Error('Qloo is not connected. Refusing to capture fake live evidence.');
}
if (status.body.qlooApiOrigin !== trustedQlooOrigin) {
  throw new Error(
    `Unexpected Qloo API origin: ${status.body.qlooApiOrigin || '(missing)'}; expected ${trustedQlooOrigin}.`,
  );
}
if (status.body.contractVersion !== expectedContractVersion) {
  throw new Error(
    `Unexpected deployment contract: ${status.body.contractVersion || '(missing)'}; expected ${expectedContractVersion}.`,
  );
}

const run = await getJson('/api/recommend', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
    anchors,
    energy:'calm',
    setting:'small-group',
    confirmedEntityIds,
    ...(reviewToken ? { reviewToken } : {}),
  }),
});

if (
  run.response.status === 409 &&
  run.body?.code === 'QLOO_RESOLUTION_REVIEW_REQUIRED' &&
  Array.isArray(run.body?.resolvedAnchors) &&
  typeof run.body?.reviewToken === 'string' &&
  run.body.reviewToken.length > 0
) {
  if (run.body.contractVersion !== expectedContractVersion) {
    throw new Error(
      `Qloo review response deployment contract mismatch: ${run.body.contractVersion || '(missing)'}; expected ${expectedContractVersion}.`,
    );
  }
  if (!requestContextMatches(run.body)) {
    throw new Error('Qloo review response did not match the live evidence request context.');
  }
  const review = run.body.resolvedAnchors
    .filter(item => item?.resolutionMatch === 'top-result')
    .map(item => ({
      query:item.query,
      name:item.name,
      entityId:item.entityId,
      requestedTypeUrn:item.requestedTypeUrn,
    }));
  const ids = review.map(item => item.entityId).join(',');
  throw new Error(
    'Qloo entity confirmation is required before live evidence capture. ' +
    'Review the returned non-exact matches in the product, confirm them, then rerun with ' +
    `RESONANCE_CONFIRMED_ENTITY_IDS=${ids} RESONANCE_REVIEW_TOKEN=${run.body.reviewToken}. ` +
    `Candidates: ${JSON.stringify(review)}`
  );
}
if (!run.response.ok) {
  throw new Error(`Live recommendation failed: HTTP ${run.response.status} ${JSON.stringify(run.body)}`);
}
if (!requestContextMatches(run.body)) {
  throw new Error('Live recommendation did not match the evidence-capture request context.');
}
if (run.body?.provenance?.apiOrigin !== status.body.qlooApiOrigin) {
  throw new Error(
    `Qloo origin provenance mismatch: status=${status.body.qlooApiOrigin || '(missing)'} recommendation=${run.body?.provenance?.apiOrigin || '(missing)'}.`,
  );
}
if (
  run.body?.provenance?.contractVersion !== expectedContractVersion ||
  run.body.provenance.contractVersion !== status.body.contractVersion
) {
  throw new Error(
    `Deployment contract provenance mismatch: expected=${expectedContractVersion} status=${status.body.contractVersion || '(missing)'} recommendation=${run.body?.provenance?.contractVersion || '(missing)'}.`,
  );
}

const confirmedTopResults = Array.isArray(run.body?.resolvedAnchors)
  ? run.body.resolvedAnchors.filter(item => item?.resolutionMatch === 'top-result')
  : [];
const confirmedIdSet = new Set(confirmedEntityIds);
if (confirmedTopResults.length > 0 && !reviewToken) {
  throw new Error('Live evidence response contains reviewed Qloo top results but no review receipt was supplied.');
}
const unconfirmedTopResults = confirmedTopResults.filter(item => !confirmedIdSet.has(item.entityId));
if (unconfirmedTopResults.length) {
  throw new Error(
    `Live evidence response contains top-result matches that were not in the explicit confirmation set: ${JSON.stringify(unconfirmedTopResults)}`,
  );
}
if (
  typeof run.body?.evidence?.topResultResolutionCount === 'number' &&
  run.body.evidence.topResultResolutionCount !== confirmedTopResults.length
) {
  throw new Error(
    `Resolution review count mismatch: evidence=${run.body.evidence.topResultResolutionCount} resolvedAnchors=${confirmedTopResults.length}.`,
  );
}

const evidence = {
  captured_at:new Date().toISOString(),
  base_url:base,
  qloo_api_origin:status.body.qlooApiOrigin,
  deployment_contract_version:expectedContractVersion,
  interpretation_limit:'Qloo affinities are aggregate cultural signals, not probabilities or claims about an individual. The session is a facilitator-reviewed starting point, not an inferred personal profile.',
  human_review:'Facilitator may accept, modify, reorder, or reject any suggestion based on the person’s actual response.',
  request:{
    anchors,
    energy:'calm',
    setting:'small-group',
    confirmedEntityIds,
  },
  confirmation_receipt:{
    required:confirmedTopResults.length > 0,
    reviewTokenUsed:Boolean(reviewToken),
    confirmedTopResultCount:confirmedTopResults.length,
    confirmedTopResults:confirmedTopResults.map(item => ({
      query:item.query,
      name:item.name,
      entityId:item.entityId,
      requestedTypeUrn:item.requestedTypeUrn,
    })),
  },
  response_summary:{
    requestContext:run.body.requestContext,
    summary:run.body.summary,
    resolvedAnchors:run.body.resolvedAnchors,
    affinities:run.body.affinities,
    evidence:run.body.evidence,
    provenance:run.body.provenance,
    agentTrace:run.body.agentTrace,
    plan:run.body.plan,
  },
};

const serialized = JSON.stringify(evidence, null, 2);
const suspicious = [
  process.env.QLOO_API_KEY,
  reviewToken,
].filter(Boolean);

for (const secret of suspicious) {
  if (serialized.includes(secret)) {
    throw new Error('Refusing to emit evidence containing a credential or ephemeral review receipt.');
  }
}

process.stdout.write(serialized + '\n');
