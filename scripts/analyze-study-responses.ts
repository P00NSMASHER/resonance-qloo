import { readFile } from 'node:fs/promises';
import { STUDY_VERSION, validateStudyResponse, type StudyResponse } from '../src/lib/studyResponse';
import { reviewedStudyIds } from '../src/lib/studyEvidenceGate';

function median(values:number[]) {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
}
function mean(values:number[]) {
  return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
}
function round(value:number|null,digits=1) {
  if (value===null) return null;
  const factor=10**digits;
  return Math.round(value*factor)/factor;
}
function parseRows(raw:string):unknown[] {
  const trimmed=raw.trim();
  if(!trimmed) return [];
  if(trimmed.startsWith('[')) {
    const parsed:unknown=JSON.parse(trimmed);
    if(!Array.isArray(parsed)) throw new Error('STUDY_INPUT_INVALID');
    return parsed;
  }
  return trimmed.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
}

async function main() {
  const [receiptsPath, manifestPath, unexpected] = process.argv.slice(2);
  if(!receiptsPath || !manifestPath || unexpected) {
    console.error('STUDY NOT READY: pass a private JSONL receipt file AND a separate facilitator-reviewed manifest.');
    console.error('Usage: npm run study:analyze -- <private-receipts.jsonl> <private-reviewed-manifest.json>');
    process.exitCode=2;
    return;
  }
  try {
    const [rawReceipts,rawManifest]=await Promise.all([
      readFile(receiptsPath,'utf8'),readFile(manifestPath,'utf8'),
    ]);
    const verifiedIds=reviewedStudyIds(JSON.parse(rawManifest),'anonymous-receipts',STUDY_VERSION);
    const parsed=parseRows(rawReceipts);
    const accepted=new Map<string,StudyResponse>();
    const duplicates=new Set<string>();
    let invalidCount=0,unreviewedCount=0;
    for(const row of parsed) {
      let receipt:StudyResponse;
      try { receipt=validateStudyResponse(row); }
      catch {invalidCount++;continue;}
      if(!verifiedIds.has(receipt.responseId)){unreviewedCount++;continue;}
      if(accepted.has(receipt.responseId)||duplicates.has(receipt.responseId)) {
        duplicates.add(receipt.responseId);
        accepted.delete(receipt.responseId);
        continue;
      }
      accepted.set(receipt.responseId,receipt);
    }

    // Never silently manufacture the reviewed set by accepting extra rows,
    // duplicates, missing receipts, or incomplete facilitator confirmations.
    const valid=[...accepted.values()];
    const missingReviewed=[...verifiedIds].filter(id=>!accepted.has(id));
    if(missingReviewed.length || duplicates.size || unreviewedCount || invalidCount ||
       valid.length<3 || valid.length>5) {
      console.error(
        'STUDY NOT READY: data needs private facilitator reconciliation; no results released. '+
        `valid=${valid.length}; invalid=${invalidCount}; unreviewed=${unreviewedCount}; `+
        `duplicates=${duplicates.size}; missingReviewed=${missingReviewed.length}; required=3–5.`,
      );
      process.exitCode=2;
      return;
    }

    const baseline=valid.map(x=>x.baselineSeconds);
    const resonance=valid.map(x=>x.resonanceSeconds);
    const saved=valid.map(x=>x.baselineSeconds-x.resonanceSeconds);
    const pct=valid.map(x=>((x.baselineSeconds-x.resonanceSeconds)/x.baselineSeconds)*100);
    const yes=valid.filter(x=>x.wouldUse).length;
    const report={
      studyVersion:STUDY_VERSION,
      evidenceClass:'facilitator-attested exploratory real-user convenience sample',
      realParticipantAuthenticity:'Human attestation, not cryptographic proof or independently verified identity.',
      validSampleSize:valid.length,
      completionThresholdMet:true,
      anonymousReceiptReviewComplete:true,
      medianBaselineSeconds:median(baseline),
      medianResonanceSeconds:median(resonance),
      medianSecondsSaved:median(saved),
      medianPercentTimeReduction:round(median(pct)),
      meanRelevance:round(mean(valid.map(x=>x.relevance))),
      meanNovelty:round(mean(valid.map(x=>x.novelty))),
      meanUsefulness:round(mean(valid.map(x=>x.usefulness))),
      wouldUseCount:yes,
      wouldUsePercent:round((yes/valid.length)*100),
      feedbackWithheldFromOutput:true,
      roleBreakdownWithheldForSmallSample:true,
      interpretation:'Descriptive timings and ratings; not causal evidence or clinical effectiveness.',
    };
    console.log(JSON.stringify(report,null,2));
  }catch {
    // Never echo malformed private receipts, participant notes, or file bytes.
    console.error('STUDY NOT READY: private receipt data or reviewed manifest could not be verified. No results released.');
    process.exitCode=2;
  }
}
await main();
