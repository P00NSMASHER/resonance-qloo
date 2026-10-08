import { readFile } from 'node:fs/promises';
import { STUDY_VERSION } from '../src/lib/studyResponse.ts';
import { reviewedStudyIds } from '../src/lib/studyEvidenceGate.ts';

const [inputPath,manifestPath,extra]=process.argv.slice(2);
if(!inputPath || !manifestPath || extra) {
  console.error('IMPACT STUDY NOT READY: supply private CSV and a separate facilitator-reviewed manifest. At least 3 real participants are required.');
  process.exit(2);
}

function parseCsvLine(line) {
  const out=[];let current='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){current+='"';i++;}
      else quoted=!quoted;
    }else if(ch===','&&!quoted){out.push(current);current='';}
    else current+=ch;
  }
  if(quoted) throw new Error('IMPACT_INVALID');
  out.push(current);
  return out;
}
const required=[
  'participant_id','role','order','without_resonance_seconds','with_resonance_seconds',
  'relevance_1_5','novelty_1_5','usefulness_1_5','would_use_again','open_feedback',
  'public_quote','quote_publishable',
];
const whole=(raw,min,max)=>{
  const text=String(raw??'').trim();
  const num=Number(text);
  return text!=='' && Number.isInteger(num) && num>=min && num<=max;
};
const median=values=>{
  const a=[...values].sort((a,b)=>a-b);const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
};
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;

try{
  const [source,reviewSource]=await Promise.all([
    readFile(inputPath,'utf8'),readFile(manifestPath,'utf8'),
  ]);
  const verified=reviewedStudyIds(JSON.parse(reviewSource),'impact-csv',STUDY_VERSION);
  const lines=source.trim().split(/\r?\n/);
  const header=lines.length?parseCsvLine(lines[0]):[];
  if(header.length!==required.length||required.some((name,i)=>header[i]!==name)) throw new Error('IMPACT_INVALID');
  const accepted=new Map();
  const duplicates=new Set();
  let invalid=0,unreviewed=0;
  for(const line of lines.slice(1).filter(Boolean)){
    const values=parseCsvLine(line);
    if(values.length!==required.length){invalid++;continue;}
    const row=Object.fromEntries(required.map((key,i)=>[key,values[i]]));
    const id=row.participant_id;
    const allowed=typeof id==='string'&&/^[a-z0-9_-]{2,64}$/i.test(id);
    const ok=allowed && Boolean(row.role?.trim()) &&
      ['A-B','B-A'].includes(row.order) &&
      whole(row.without_resonance_seconds,15,3600) &&
      whole(row.with_resonance_seconds,5,1800) &&
      ['relevance_1_5','novelty_1_5','usefulness_1_5'].every(k=>whole(row[k],1,5)) &&
      ['yes','no'].includes(row.would_use_again.toLowerCase()) &&
      ['yes','no'].includes(row.quote_publishable.toLowerCase());
    if(!ok){invalid++;continue;}
    if(!verified.has(id)){unreviewed++;continue;}
    if(accepted.has(id)||duplicates.has(id)){duplicates.add(id);accepted.delete(id);continue;}
    accepted.set(id,row);
  }
  const complete=[...accepted.values()];
  const missing=[...verified].filter(id=>!accepted.has(id));
  if(complete.length<3||complete.length>5||invalid||unreviewed||duplicates.size||missing.length){
    console.error(
      'IMPACT STUDY NOT READY: at least 3 real participants and a reconciled facilitator review are required; no results released. '+
      `valid=${complete.length}; invalid=${invalid}; unreviewed=${unreviewed}; duplicates=${duplicates.size}; missingReviewed=${missing.length}`,
    );
    process.exit(2);
  }
  const nums=key=>complete.map(row=>Number(row[key]));
  const without=median(nums('without_resonance_seconds'));
  const withResonance=median(nums('with_resonance_seconds'));
  const pct=complete.map(row=>(Number(row.without_resonance_seconds)-Number(row.with_resonance_seconds))/Number(row.without_resonance_seconds)*100);
  const again=complete.filter(row=>row.would_use_again.toLowerCase()==='yes').length;
  console.log(JSON.stringify({
    evidenceClass:'facilitator-attested exploratory real-user convenience sample',
    realParticipantAuthenticity:'Human attestation, not cryptographic proof.',
    participant_count:complete.length,
    median_without_resonance_seconds:without,
    median_with_resonance_seconds:withResonance,
    median_paired_time_reduction_percent:Number(median(pct).toFixed(1)),
    average_relevance:Number(mean(nums('relevance_1_5')).toFixed(2)),
    average_novelty:Number(mean(nums('novelty_1_5')).toFixed(2)),
    average_usefulness:Number(mean(nums('usefulness_1_5')).toFixed(2)),
    would_use_again:{yes:again,total:complete.length},
    feedbackWithheldFromOutput:true,
    quotesWithheldPendingSeparateExplicitPublicationReview:true,
    interpretation:'Descriptive convenience-sample measurements only, not causal or clinical efficacy.',
  },null,2));
}catch{
  console.error('IMPACT STUDY NOT READY: source or private facilitator review failed verification. No results released.');
  process.exitCode=2;
}
