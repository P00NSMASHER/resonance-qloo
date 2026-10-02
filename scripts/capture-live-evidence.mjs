const base = (process.env.RESONANCE_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const trustedQlooOrigin = (process.env.QLOO_TRUSTED_BASE_URL || 'https://hackathon.api.qloo.com').replace(/\/$/, '');
const anchors = ['Ella Fitzgerald', "Singin' in the Rain", 'Italian food'];
const confirmedEntityIds = (process.env.RESONANCE_CONFIRMED_ENTITY_IDS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
  .slice(0,4);

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

const run = await getJson('/api/recommend', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
    anchors,
    energy:'calm',
    setting:'small-group',
    confirmedEntityIds,
  }),
});

if (!run.response.ok) {
  throw new Error(`Live recommendation failed: HTTP ${run.response.status} ${JSON.stringify(run.body)}`);
}
if (run.body?.provenance?.apiOrigin !== status.body.qlooApiOrigin) {
  throw new Error(
    `Qloo origin provenance mismatch: status=${status.body.qlooApiOrigin || '(missing)'} recommendation=${run.body?.provenance?.apiOrigin || '(missing)'}.`,
  );
}

const evidence = {
  captured_at:new Date().toISOString(),
  base_url:base,
  qloo_api_origin:status.body.qlooApiOrigin,
  request:{
    anchors,
    energy:'calm',
    setting:'small-group',
    confirmedEntityIds,
  },
  response_summary:{
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
].filter(Boolean);

for (const secret of suspicious) {
  if (serialized.includes(secret)) {
    throw new Error('Refusing to emit evidence containing QLOO_API_KEY.');
  }
}

process.stdout.write(serialized + '\n');
