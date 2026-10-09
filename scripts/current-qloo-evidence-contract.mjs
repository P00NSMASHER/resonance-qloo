// Frozen evidence is a public, source-reproducible record of a particular
// live Qloo response, not an assertion that future tastes/tags are identical.
export const CANONICAL_JUDGE_INPUT = Object.freeze({
  anchors:[
    {query:'Ella Fitzgerald',type:'artist'},
    {query:'Roman Holiday',type:'movie'},
  ],
  energy:'calm',
  setting:'small-group',
  durationMinutes:30,
});
export const TRUSTED_QLOO_ORIGIN = 'https://hackathon.api.qloo.com';

const required = (check,description) => {
  if (!check) throw new Error('CURRENT_QLOO_EVIDENCE_INVALID: '+description);
};
const normalized=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const containsSecretKey = key=>/(?:api[_-]?key|secret|password|authorization|bearer|reviewtoken|access[_-]?token|private[_-]?key)/i.test(key);
const scanKeys = (record) => {
  if (Array.isArray(record)) {for (const value of record) scanKeys(value);return;}
  if (record && typeof record==='object') {
    for (const [key,value] of Object.entries(record)) {
      required(!containsSecretKey(key),'secret-bearing field in public response');
      scanKeys(value);
    }
  }
};

export function verifyCurrentLiveEvidence(artifact,expectedContract) {
  required(artifact && typeof artifact==='object','record missing');
  required(artifact.schemaVersion===1,'schema version');
  required(artifact.captureType==='actual-public-qloo-production-response','not a real public capture');
  required(artifact.endpoint==='https://resonance-qloo.floot.app/_api/recommend','unexpected target');
  required(Number.isFinite(Date.parse(artifact.capturedAtUtc)),'capture timestamp');
  const status=artifact.publicStatus,request=artifact.request,response=artifact.responseSummary;
  required(status && request && response,'missing request/status/response');
  required(status.httpStatus===200 && status.service==='resonance' &&
    status.qlooStatus==='ready' && status.qlooConnected===true &&
    status.qlooApiOrigin===TRUSTED_QLOO_ORIGIN &&
    status.contractVersion===expectedContract,'unverified Qloo connection');
  required(artifact.httpStatus===200,'recommendation not HTTP 200');
  required(JSON.stringify(request)===JSON.stringify(CANONICAL_JUDGE_INPUT),'non-canonical input');
  const ctx=response.requestContext;
  required(ctx?.energy==='calm' && ctx?.setting==='small-group' &&
    ctx?.durationMinutes===30 && Array.isArray(ctx.anchors) &&
    ctx.anchors.length===2,'request context mismatch');
  for (let i=0;i<2;i++) {
    required(normalized(ctx.anchors[i]?.query)===normalized(request.anchors[i].query),'anchor text mismatch');
    required(ctx.anchors[i]?.typeUrn==='urn:entity:'+request.anchors[i].type,'anchor type mismatch');
  }
  required(Array.isArray(response.resolvedAnchors)&&response.resolvedAnchors.length===2,'two Qloo resolutions expected');
  for (let i=0;i<2;i++) {
    const item=response.resolvedAnchors[i];
    required(item?.resolutionMatch==='exact-name' &&
      normalized(item.query)===normalized(request.anchors[i].query) &&
      normalized(item.name)===normalized(request.anchors[i].query) &&
      item.requestedTypeUrn==='urn:entity:'+request.anchors[i].type &&
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.entityId),'unverified exact Qloo entity');
  }
  const e=response.evidence,affinities=response.affinities,plan=response.plan,prov=response.provenance;
  required(prov?.source==='qloo-live' && prov?.apiOrigin===TRUSTED_QLOO_ORIGIN &&
    prov?.contractVersion===expectedContract && Number.isFinite(Date.parse(prov.generatedAt)),'not live Qloo provenance');
  required(Date.parse(prov.generatedAt)<=Date.parse(artifact.capturedAtUtc)+120_000 &&
    Date.parse(prov.generatedAt)>=Date.parse(artifact.capturedAtUtc)-15*60_000,'generation not tied to capture');
  required(e?.evidenceBasis==='ranked-order' && e.meanNormalizedScore===null &&
    e.selectedAffinityCount===4 && e.resolvedAnchorCount===2 &&
    e.exactResolutionCount===2 && e.topResultResolutionCount===0 &&
    e.categoryHintCount===2 && e.sessionDurationMinutes===30 &&
    e.energy==='calm' && e.setting==='small-group','evidence contract mismatch');
  required(Array.isArray(affinities) && affinities.length>=4 &&
    affinities.length<=16 && affinities.length===e.returnedAffinityCount,'inconsistent filtered Qloo tags');
  required(affinities.every((x,i)=>x&&typeof x.label==='string'&&x.label.trim() &&
    x.rank===i+1 && (x.score===null || (typeof x.score==='number' && x.score>=0 && x.score<=1))),
    'invalid genuine tag ranking');
  required(Array.isArray(e.selectedAffinityLabels)&&e.selectedAffinityLabels.length===4 &&
    e.selectedAffinityLabels.every((x,i)=>x===affinities[i].label),'selected labels changed');
  required(Array.isArray(plan)&&plan.length===4,'four-step plan missing');
  let total=0;
  for(let i=0;i<plan.length;i++){
    const step=plan[i];
    const minutes=Number(String(step?.duration).match(/^(\d+) min$/)?.[1]);
    required(Number.isInteger(minutes)&&minutes>0,'invalid session duration');
    total+=minutes;
    required(step.affinityLabel===e.selectedAffinityLabels[i] &&
      typeof step.title==='string'&&step.title.trim() &&
      typeof step.why==='string'&&step.why.trim() &&
      typeof step.action==='string'&&step.action.includes('Facilitator cue:') &&
      step.action.includes('allow anyone to pass'),'activity not grounded and facilitator-ready');
  }
  required(total===30,'timeboxes do not sum to 30 minutes');
  scanKeys(artifact);
  required(artifact.humanStudyClaim==='no validated human outcome collected',
    'false or missing human-study disclaimer');
  required(artifact.historicalEvaluationNotOverwritten===true,'history attribution missing');
  return {entities:2,signals:affinities.length,selected:4,steps:4,minutes:total,
    source:prov.source,rankedOrderWithoutMean:true};
}
