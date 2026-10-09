import { readFile } from 'node:fs/promises';
import { CANONICAL_JUDGE_INPUT, verifyCurrentLiveEvidence } from './current-qloo-evidence-contract.mjs';

const base=(process.env.RESONANCE_BASE_URL||'https://resonance-qloo.floot.app').replace(/\/$/,'');
if(base!=='https://resonance-qloo.floot.app') throw new Error('Refusing non-production evidence origin.');
const expected=JSON.parse(await readFile(new URL('../deployment-contract.json',import.meta.url),'utf8')).version;
async function json(url,options={}) {
  const r=await fetch(url,{...options,redirect:'error',
    signal:AbortSignal.timeout(35000),headers:{accept:'application/json',...(options.headers||{})}});
  const envelope=await r.json();
  if(!envelope || typeof envelope!=='object' || !envelope.json || typeof envelope.json!=='object') {
    throw new Error('Unexpected Floot response envelope or invalid JSON.');
  }
  return {status:r.status,data:envelope.json};
}
const status=await json(base+'/_api/status');
if(status.status!==200 || status.data.qlooStatus!=='ready' ||
   status.data.qlooConnected!==true) throw new Error('Qloo public status not verified.');
const start=Date.now();
const response=await json(base+'/_api/recommend',{method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({json:CANONICAL_JUDGE_INPUT})});
if(response.status!==200) {
  throw new Error('Live recommendation did not return HTTP 200; no evidence emitted.');
}
const d=response.data;
const artifact={
  schemaVersion:1,
  captureType:'actual-public-qloo-production-response',
  capturedAtUtc:new Date().toISOString(),
  endpoint:base+'/_api/recommend',
  httpStatus:response.status,
  request:CANONICAL_JUDGE_INPUT,
  publicStatus:{
    httpStatus:status.status,
    service:status.data.service,
    qlooStatus:status.data.qlooStatus,
    qlooConnected:status.data.qlooConnected,
    qlooApiOrigin:status.data.qlooApiOrigin,
    contractVersion:status.data.contractVersion,
  },
  responseSummary:{
    requestContext:d.requestContext,
    summary:d.summary,
    resolvedAnchors:d.resolvedAnchors?.map(x=>({
      query:x.query,name:x.name,entityId:x.entityId,requestedTypeUrn:x.requestedTypeUrn,
      resolutionMatch:x.resolutionMatch,
    })),
    affinities:d.affinities?.map(x=>({label:x.label,score:x.score,rank:x.rank})),
    evidence:d.evidence,
    provenance:d.provenance,
    plan:d.plan?.map(x=>({title:x.title,duration:x.duration,affinityLabel:x.affinityLabel,
      action:x.action,why:x.why})),
    agentTrace:d.agentTrace?.map(x=>({stage:x.stage,status:x.status,detail:x.detail})),
  },
  humanStudyClaim:'no validated human outcome collected',
  historicalEvaluationNotOverwritten:true,
  limitations:[
    'Qloo cultural affinities are aggregate signals, not personal preferences or a clinical determination.',
    'This captures a public live response at one timestamp; tags and results may change on later runs.',
    'Numeric scores from separate genre families are not converted into a shared confidence mean.',
    'Facilitator cues are authored deterministic guidance, not claims that Qloo wrote the activity.',
    'The previous unfavorable synthetic evaluation and zero validated real-user responses remain disclosed.',
  ],
};
const result=verifyCurrentLiveEvidence(artifact,expected);
if(Date.now()-start>35000) throw new Error('Upstream response exceeded evidence timing bound.');
console.error('Verified current live Qloo evidence:',JSON.stringify(result));
process.stdout.write(JSON.stringify(artifact,null,2)+'\n');
