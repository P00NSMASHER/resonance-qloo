import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script=fileURLToPath(new URL('./summarize-impact-study.mjs',import.meta.url));
function run(path){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[script,path],{stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);p.on('close',code=>resolve({code,out,err}));});}
const dir=await mkdtemp(join(tmpdir(),'resonance-impact-'));
try {
  const header='participant_id,role,order,without_resonance_seconds,with_resonance_seconds,relevance_1_5,novelty_1_5,usefulness_1_5,would_use_again,open_feedback,public_quote,quote_publishable\n';
  const short=join(dir,'short.csv');
  await writeFile(short,header+'P01,Activity Director,A-B,600,120,5,4,5,yes,,,no\nP02,Family Caregiver,B-A,480,180,4,4,4,yes,,,no\n');
  const blocked=await run(short);
  if(blocked.code!==2||!blocked.err.includes('at least 3 real participants')) throw new Error('Undersized study did not fail closed.');

  const valid=join(dir,'valid.csv');
  await writeFile(valid,header+
    'P01,Activity Director,A-B,600,120,5,4,5,yes,,,no\n'+
    'P02,Family Caregiver,B-A,480,180,4,4,4,yes,,,no\n'+
    'P03,Recreation Staff,A-B,540,150,5,5,4,yes,,Helpful starting point,yes\n');
  const ok=await run(valid);
  if(ok.code!==0) throw new Error(ok.err);
  const summary=JSON.parse(ok.out);
  if(summary.participant_count!==3||summary.median_without_resonance_seconds!==540||summary.median_with_resonance_seconds!==150||summary.would_use_again.yes!==3) throw new Error('Unexpected impact-study aggregate.');
  console.log('Impact study summarizer self-test passed.');
} finally { await rm(dir,{recursive:true,force:true}); }
