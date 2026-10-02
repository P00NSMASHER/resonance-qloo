import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const capturePath = fileURLToPath(new URL('./capture-live-evidence.mjs', import.meta.url));
const QLOO_ORIGIN = 'https://hackathon.api.qloo.com';
const CONTRACT_VERSION = JSON.parse(
  await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'),
).version;
const CONFIRMED_ID = '9A25B172-4795-43E4-B222-3B550DC05AAA';
const SECRET = 'qloo-capture-selftest-secret';
const REVIEW_TOKEN = 'selftest-review-receipt';

let responseMode = 'normal';

function runCapture(baseUrl, confirmedEntityIds = '', reviewToken = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [capturePath], {
      env:{
        ...process.env,
        RESONANCE_BASE_URL:baseUrl,
        QLOO_TRUSTED_BASE_URL:QLOO_ORIGIN,
        QLOO_API_KEY:SECRET,
        RESONANCE_CONFIRMED_ENTITY_IDS:confirmedEntityIds,
        RESONANCE_REVIEW_TOKEN:reviewToken,
      },
      stdio:['ignore','pipe','pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

const server = createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
    });
    res.end(JSON.stringify(body));
  };

  if (req.url === '/api/status') {
    send(200, {
      qlooConnected:true,
      qlooConfigured:true,
      qlooStatus:'ready',
      qlooApiOrigin:QLOO_ORIGIN,
      contractVersion:responseMode === 'status-contract-mismatch' ? 'stale-contract' : CONTRACT_VERSION,
      mode:'live',
      service:'resonance',
    });
    return;
  }

  if (req.url === '/api/recommend' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += String(chunk);
    const body = raw ? JSON.parse(raw) : {};
    const confirmed = Array.isArray(body.confirmedEntityIds) ? body.confirmedEntityIds : [];
    const suppliedReviewToken = typeof body.reviewToken === 'string' ? body.reviewToken : '';

    const requestContext = {
      anchors:[
        { query:'Ella Fitzgerald' },
        { query:"Singin' in the Rain" },
        { query:responseMode === 'context-mismatch' ? 'French food' : 'Italian food' },
      ],
      energy:'calm',
      setting:'small-group',
      durationMinutes:45,
    };

    const resolvedAnchors = [
      {
        query:'Ella Fitzgerald',
        name:'Ella Fitzgerald',
        entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9',
        resolutionMatch:'exact-name',
      },
      {
        query:'Italian food',
        name:'Italian cuisine',
        entityId:CONFIRMED_ID,
        resolutionMatch:'top-result',
      },
    ];

    if (!confirmed.length || suppliedReviewToken !== REVIEW_TOKEN) {
      send(409, {
        error:'Review Qloo entity matches before continuing.',
        code:'QLOO_RESOLUTION_REVIEW_REQUIRED',
        requestContext,
        resolvedAnchors,
        reviewToken:REVIEW_TOKEN,
      });
      return;
    }

    send(200, {
      requestContext,
      summary:'Self-test live recommendation.',
      resolvedAnchors,
      affinities:[
        { label:'Jazz', score:null, rank:1 },
        { label:'Musicals', score:null, rank:2 },
        { label:'Classic cinema', score:null, rank:3 },
      ],
      evidence:{
        evidenceBasis:'ranked-order',
        meanNormalizedScore:null,
        resolvedAnchorCount:2,
        exactResolutionCount:1,
        topResultResolutionCount:responseMode === 'count-mismatch' ? 2 : 1,
        categoryHintCount:0,
        selectedAffinityCount:3,
        returnedAffinityCount:3,
        selectedAffinityLabels:['Jazz','Musicals','Classic cinema'],
        explainabilityResultCount:0,
        aggregateExplainabilityAvailable:false,
        sessionDurationMinutes:45,
        energy:'calm',
        setting:'small-group',
      },
      provenance:{
        source:'qloo-live',
        apiOrigin:QLOO_ORIGIN,
        contractVersion:responseMode === 'provenance-contract-mismatch' ? 'stale-contract' : CONTRACT_VERSION,
        generatedAt:'2026-10-02T00:00:00.000Z',
      },
      agentTrace:[
        { stage:'resolve', status:'ok', detail:'Self-test resolve.' },
        { stage:'evaluate', status:'ok', detail:'Self-test evaluate.' },
      ],
      plan:[
        { title:'Opening cue', duration:'10 min', action:'A', why:'A', affinityLabel:'Jazz' },
        { title:'Story bridge', duration:'10 min', action:'B', why:'B', affinityLabel:'Musicals' },
        { title:'Shared choice', duration:'15 min', action:'C', why:'C', affinityLabel:'Classic cinema' },
        { title:'Closing ritual', duration:'10 min', action:'D', why:'D', affinityLabel:'Classic cinema' },
      ],
    });
    return;
  }

  send(404, { error:'not found' });
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') {
  server.close();
  throw new Error('Evidence-capture mock server did not expose a TCP port.');
}
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const needsReview = await runCapture(baseUrl);
  const reviewOutput = needsReview.stdout + '\n' + needsReview.stderr;
  if (
    needsReview.code === 0 ||
    !reviewOutput.includes('Qloo entity confirmation is required') ||
    !reviewOutput.includes(`RESONANCE_CONFIRMED_ENTITY_IDS=${CONFIRMED_ID}`) ||
    !reviewOutput.includes(`RESONANCE_REVIEW_TOKEN=${REVIEW_TOKEN}`)
  ) {
    throw new Error(`Expected review-required capture failure. stdout=${needsReview.stdout} stderr=${needsReview.stderr}`);
  }

  responseMode = 'normal';
  const idOnly = await runCapture(baseUrl, CONFIRMED_ID);
  const idOnlyOutput = idOnly.stdout + '\n' + idOnly.stderr;
  if (
    idOnly.code === 0 ||
    !idOnlyOutput.includes('Qloo entity confirmation is required') ||
    !idOnlyOutput.includes(`RESONANCE_REVIEW_TOKEN=${REVIEW_TOKEN}`)
  ) {
    throw new Error(`Expected ID-only evidence capture to require the server receipt. stdout=${idOnly.stdout} stderr=${idOnly.stderr}`);
  }

  const success = await runCapture(baseUrl, CONFIRMED_ID, REVIEW_TOKEN);
  if (success.code !== 0) {
    throw new Error(`Expected confirmed evidence capture to pass. stdout=${success.stdout} stderr=${success.stderr}`);
  }
  if (success.stdout.includes(SECRET)) {
    throw new Error('Evidence capture emitted QLOO_API_KEY.');
  }
  if (success.stdout.includes(REVIEW_TOKEN)) {
    throw new Error('Evidence capture emitted the ephemeral Qloo review receipt.');
  }
  const artifact = JSON.parse(success.stdout);
  if (
    typeof artifact.interpretation_limit !== 'string' ||
    !artifact.interpretation_limit.includes('aggregate cultural signals') ||
    !artifact.interpretation_limit.includes('not probabilities or claims about an individual') ||
    typeof artifact.human_review !== 'string' ||
    !artifact.human_review.includes('accept, modify, reorder, or reject')
  ) {
    throw new Error('Evidence capture did not preserve responsible interpretation limits.');
  }
  if (
    artifact.confirmation_receipt?.required !== true ||
    artifact.confirmation_receipt?.reviewTokenUsed !== true ||
    artifact.confirmation_receipt?.confirmedTopResultCount !== 1 ||
    artifact.confirmation_receipt?.confirmedTopResults?.[0]?.entityId !== CONFIRMED_ID ||
    artifact.deployment_contract_version !== CONTRACT_VERSION
  ) {
    throw new Error('Confirmation receipt did not preserve the reviewed top-result mapping.');
  }

  responseMode = 'normal';
  const wrongConfirmation = await runCapture(baseUrl, 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA', REVIEW_TOKEN);
  const wrongOutput = wrongConfirmation.stdout + '\n' + wrongConfirmation.stderr;
  if (
    wrongConfirmation.code === 0 ||
    !wrongOutput.includes('were not in the explicit confirmation set')
  ) {
    throw new Error(`Expected unconfirmed successful response to be rejected. stdout=${wrongConfirmation.stdout} stderr=${wrongConfirmation.stderr}`);
  }

  responseMode = 'status-contract-mismatch';
  const wrongStatusContract = await runCapture(baseUrl, CONFIRMED_ID, REVIEW_TOKEN);
  const wrongStatusContractOutput = wrongStatusContract.stdout + '\n' + wrongStatusContract.stderr;
  if (
    wrongStatusContract.code === 0 ||
    !wrongStatusContractOutput.includes('Unexpected deployment contract')
  ) {
    throw new Error(`Expected status deployment-contract mismatch to be rejected. stdout=${wrongStatusContract.stdout} stderr=${wrongStatusContract.stderr}`);
  }

  responseMode = 'provenance-contract-mismatch';
  const wrongProvenanceContract = await runCapture(baseUrl, CONFIRMED_ID, REVIEW_TOKEN);
  const wrongProvenanceContractOutput = wrongProvenanceContract.stdout + '\n' + wrongProvenanceContract.stderr;
  if (
    wrongProvenanceContract.code === 0 ||
    !wrongProvenanceContractOutput.includes('Deployment contract provenance mismatch')
  ) {
    throw new Error(`Expected recommendation deployment-contract mismatch to be rejected. stdout=${wrongProvenanceContract.stdout} stderr=${wrongProvenanceContract.stderr}`);
  }

  responseMode = 'context-mismatch';
  const wrongContext = await runCapture(baseUrl, CONFIRMED_ID, REVIEW_TOKEN);
  const wrongContextOutput = wrongContext.stdout + '\n' + wrongContext.stderr;
  if (
    wrongContext.code === 0 ||
    !wrongContextOutput.includes('did not match the evidence-capture request context')
  ) {
    throw new Error(`Expected mismatched request receipt to be rejected. stdout=${wrongContext.stdout} stderr=${wrongContext.stderr}`);
  }

  responseMode = 'count-mismatch';
  const mismatch = await runCapture(baseUrl, CONFIRMED_ID, REVIEW_TOKEN);
  const mismatchOutput = mismatch.stdout + '\n' + mismatch.stderr;
  if (
    mismatch.code === 0 ||
    !mismatchOutput.includes('Resolution review count mismatch')
  ) {
    throw new Error(`Expected review-count mismatch to be rejected. stdout=${mismatch.stdout} stderr=${mismatch.stderr}`);
  }

  console.log('Evidence capture self-test passed.');
} finally {
  server.close();
  await once(server, 'close');
}
