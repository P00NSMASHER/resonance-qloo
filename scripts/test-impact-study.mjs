import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script=fileURLToPath(new URL('./summarize-impact-study.mjs',import.meta.url));
function run(csv,manifest){return new Promise((resolve,reject)=>{
  const args=['--import','tsx',script,csv,...(manifest?[manifest]:[])];
  const p=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);
  p.on('error',reject);p.on('close',code=>resolve({code,out,err}));
});}
const attestation='I personally checked that each listed receipt came from a consenting eligible adult who tested live Resonance; no synthetic, demo, or test fixture is included.';
const reviewEntry=id=>({
  responseId:id,consentReviewed:true,eligibleAdultVerified:true,
  receiptReceived:true,liveResonanceVerified:true,notFixtureVerified:true,
});
const manifestFor=ids=>({
  manifestVersion:'2026-10-08-v1',source:'impact-csv',studyVersion:'2026-10-07-v2',
  reviewedOn:'2026-10-08',facilitatorAttestation:attestation,
  participants:ids.map(reviewEntry),
});
const dir=await mkdtemp(join(tmpdir(),'resonance-impact-SYNTHETIC-'));
try {
  const header='participant_id,role,order,without_resonance_seconds,with_resonance_seconds,relevance_1_5,novelty_1_5,usefulness_1_5,would_use_again,open_feedback,public_quote,quote_publishable\n';
  const one='P01,Activity Director,A-B,600,120,5,4,5,yes,PRIVATE_FIXTURE_COMMENT,,no\n';
  const two='P02,Family Caregiver,B-A,480,180,4,4,4,yes,,,no\n';
  const three='P03,Recreation Staff,A-B,540,150,5,5,4,yes,,PRIVATE_FIXTURE_QUOTE,yes\n';
  const csv=join(dir,'synthetic-fixture.csv'),manifest=join(dir,'synthetic-review.json');
  await writeFile(csv,header+one+two+three);
  await writeFile(manifest,JSON.stringify(manifestFor(['P01','P02','P03'])));

  const absent=await run(csv);
  if(absent.code!==2||absent.out.trim())throw new Error('Missing facilitator review leaked an aggregate.');

  const valid=await run(csv,manifest);
  if(valid.code!==0)throw new Error(valid.err);
  const report=JSON.parse(valid.out);
  if(report.participant_count!==3||report.median_without_resonance_seconds!==540||
    report.median_with_resonance_seconds!==150||report.would_use_again.yes!==3||
    !report.quotesWithheldPendingSeparateExplicitPublicationReview
  )throw new Error('Unexpected controlled synthetic-fixture aggregate.');
  if(valid.out.includes('PRIVATE_FIXTURE_COMMENT')||valid.out.includes('PRIVATE_FIXTURE_QUOTE')) {
    throw new Error('Private comment or quote leaked to report.');
  }

  await writeFile(csv,header+one+two);
  const short=await run(csv,manifest);
  if(short.code!==2||short.out.trim()||!short.err.includes('at least 3 real participants')) {
    throw new Error('Undersized or missing-reviewed fixture did not fail closed.');
  }

  await writeFile(csv,header+one+two+three+one);
  const duplicate=await run(csv,manifest);
  if(duplicate.code!==2||duplicate.out.trim()) throw new Error('Duplicate fixture was admitted.');

  await writeFile(csv,header+one+two+three);
  const incorrect=manifestFor(['P01','P02','P03']);
  incorrect.participants[0].notFixtureVerified=false;
  await writeFile(manifest,JSON.stringify(incorrect));
  const unreviewed=await run(csv,manifest);
  if(unreviewed.code!==2||unreviewed.out.trim())throw new Error('Unverified fixture was admitted.');
  console.log('Synthetic-only impact study release gate self-test passed.');
} finally { await rm(dir,{recursive:true,force:true}); }
