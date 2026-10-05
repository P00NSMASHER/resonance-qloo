import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const base = (process.env.RESONANCE_BASE_URL || 'https://resonance-qloo.floot.app').replace(/\/$/, '');
const out = process.env.CANONICAL_SWEEP_OUT || 'docs/agent-evaluation/canonical-candidate-runs.json';
const candidates = [
  ['C01','Ella Fitzgerald',"Breakfast at Tiffany's"],
  ['C02','Louis Armstrong','Roman Holiday'],
  ['C03','Duke Ellington','The Philadelphia Story'],
  ['C04','Nat King Cole','An Affair to Remember'],
  ['C05','Doris Day','The Sound of Music'],
  ['C06','Frank Sinatra','Rear Window'],
  ['C07','The Supremes',"Breakfast at Tiffany's"],
  ['C08','Benny Goodman','Casablanca'],
  ['C09','Billie Holiday','Roman Holiday'],
  ['C10','Judy Garland','The African Queen'],
  ['C11','Sam Cooke','To Kill a Mockingbird'],
  ['C12','Nina Simone','The Apartment'],
];

async function request(path,init) {
  const response = await fetch(base + path,{...init,signal:AbortSignal.timeout(30_000)});
  const parsed = await response.json().catch(() => ({}));
  const body = parsed && typeof parsed === 'object' && parsed.json && typeof parsed.json === 'object' ? parsed.json : parsed;
  return {response,body};
}

async function api(path,init) {
  const primary = await request('/_api' + path,init);
  if (primary.response.status !== 404) return primary;
  return request('/api' + path,init);
}

const status = await api('/status?refresh=1');
if (!status.response.ok || status.body?.qlooStatus !== 'ready') {
  throw new Error('Live Qloo readiness failed; refusing to run the candidate sweep.');
}

const results = [];
for (const [id,artist,movie] of candidates) {
  const payload = {
    anchors:[
      {query:artist,type:'artist'},
      {query:movie,type:'movie'},
    ],
    energy:'calm',
    setting:'small-group',
    durationMinutes:30,
  };
  const run = await api('/recommend',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({json:payload}),
  });
  results.push({
    id,
    request:payload,
    httpStatus:run.response.status,
    response:run.body,
  });
  await new Promise(resolve => setTimeout(resolve,1500));
}

const artifact = {
  schemaVersion:1,
  evidenceClass:'live technical candidate evidence; reviewer judgments are synthetic agent evaluation—not real-user evidence',
  capturedAt:new Date().toISOString(),
  baseUrl:base,
  qlooStatus:{
    status:status.body?.qlooStatus,
    apiOrigin:status.body?.qlooApiOrigin,
    contractVersion:status.body?.contractVersion,
  },
  fixedCandidateCount:candidates.length,
  results,
};

await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(artifact,null,2) + '\n');
console.log('Captured',results.length,'pre-registered candidates to',out);
console.log(results.map(item => item.id + ':' + item.httpStatus).join(' '));
