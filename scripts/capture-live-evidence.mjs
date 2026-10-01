const base = (process.env.RESONANCE_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const anchors = ['Ella Fitzgerald', "Singin' in the Rain", 'Italian food'];

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

const run = await getJson('/api/recommend', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
    anchors,
    energy:'calm',
    setting:'small-group',
  }),
});

if (!run.response.ok) {
  throw new Error(`Live recommendation failed: HTTP ${run.response.status} ${JSON.stringify(run.body)}`);
}

const evidence = {
  captured_at:new Date().toISOString(),
  base_url:base,
  request:{
    anchors,
    energy:'calm',
    setting:'small-group',
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
