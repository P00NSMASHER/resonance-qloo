import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script=fileURLToPath(new URL('./analyze-study-responses.ts',import.meta.url));
function run(receipts,manifest) {return new Promise((resolve,reject)=>{
  const args=['--import','tsx',script,receipts,...(manifest?[manifest]:[])];
  const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',chunk=>out+=chunk);
  child.stderr.on('data',chunk=>err+=chunk);
  child.on('error',reject);child.on('close',code=>resolve({code,out,err}));
});}

const attestation='I personally checked that each listed receipt came from a consenting eligible adult who tested live Resonance; no synthetic, demo, or test fixture is included.';
const id=[
  '123e4567-e89b-12d3-a456-426614174000',
  '123e4567-e89b-12d3-a456-426614174001',
  '123e4567-e89b-12d3-a456-426614174002',
];
const makeReceipt=(responseId,baselineSeconds,resonanceSeconds,feedback,wouldUse)=>({
  studyVersion:'2026-10-07-v2',responseId,role:'activity-director',
  baselineSeconds,resonanceSeconds,relevance:3,novelty:4,usefulness:2,
  wouldUse,feedback,consent:true,
});
const sample=[
  makeReceipt(id[0],480,90,'PRIVATE_FIXTURE_COMMENT_ONE',true),
  makeReceipt(id[1],420,180,'PRIVATE_FIXTURE_COMMENT_TWO',false),
  makeReceipt(id[2],90,130,'PRIVATE_FIXTURE_COMMENT_THREE',false),
];
const makeReview=(ids)=>({
  manifestVersion:'2026-10-08-v1',source:'anonymous-receipts',
  studyVersion:'2026-10-07-v2',reviewedOn:'2026-10-08',
  facilitatorAttestation:attestation,
  participants:ids.map(responseId=>({
    responseId,consentReviewed:true,eligibleAdultVerified:true,
    receiptReceived:true,liveResonanceVerified:true,notFixtureVerified:true,
  })),
});
const dir=await mkdtemp(join(tmpdir(),'resonance-SYNTHETIC-evidence-'));
try{
  const receipts=join(dir,'synthetic-receipts.jsonl');
  const reviewed=join(dir,'synthetic-review.json');
  const write=async entries=>writeFile(receipts,entries.map(x=>JSON.stringify(x)).join('\n')+'\n');
  await write(sample);
  await writeFile(reviewed,JSON.stringify(makeReview(id)));

  const missing=await run(receipts);
  if(missing.code!==2||missing.out.trim())throw new Error('Missing review released fixture metrics.');

  const good=await run(receipts,reviewed);
  if(good.code!==0)throw new Error('Controlled synthetic fixture failed: '+good.err);
  const parsed=JSON.parse(good.out);
  if(parsed.validSampleSize!==3||parsed.medianBaselineSeconds!==420||
    parsed.medianResonanceSeconds!==130||parsed.medianSecondsSaved!==240||
    parsed.wouldUseCount!==1||!parsed.feedbackWithheldFromOutput) {
    throw new Error('Synthetic-fixture summary not faithful to deliberately unfavorable data.');
  }
  if(good.out.includes('PRIVATE_FIXTURE_COMMENT')||good.out.includes(id[0])) throw new Error('Private synthetic fixture leaked in aggregate.');

  await write(sample.slice(0,2));
  const undersized=await run(receipts,reviewed);
  if(undersized.code!==2||undersized.out.trim()) throw new Error('Unmet review count generated statistics.');

  await write([...sample,sample[0]]);
  const duplicate=await run(receipts,reviewed);
  if(duplicate.code!==2||duplicate.out.trim())throw new Error('Duplicate receipt generated statistics.');

  await write([...sample,{...sample[0],responseId:'123e4567-e89b-12d3-a456-426614174999'}]);
  const extra=await run(receipts,reviewed);
  if(extra.code!==2||extra.out.trim())throw new Error('Unreviewed receipt generated statistics.');

  await write([...sample.slice(0,2),{...sample[2],feedback:'Email me at person@example.com'}]);
  const invalid=await run(receipts,reviewed);
  if(invalid.code!==2||invalid.out.trim()||invalid.err.includes('person@example.com'))throw new Error('Invalid receipt leaked sensitive text.');
  console.log('Synthetic-only anonymous receipt evidence gate self-test passed.');
}finally{await rm(dir,{recursive:true,force:true});}
