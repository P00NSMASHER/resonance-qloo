import { readFile } from 'node:fs/promises';

const path = process.argv[2] || 'docs/impact-study-responses.csv';
const raw = await readFile(path,'utf8');
const lines = raw.trim().split(/\r?\n/);
if (lines.length < 2) {
  console.error('IMPACT STUDY NOT READY: no participant rows.');
  process.exit(2);
}

function parseCsvLine(line) {
  const out=[]; let cur=''; let quoted=false;
  for (let i=0;i<line.length;i++) {
    const ch=line[i];
    if (ch==='"') {
      if (quoted && line[i+1]==='"') { cur+='"'; i++; }
      else quoted=!quoted;
    } else if (ch===',' && !quoted) { out.push(cur); cur=''; }
    else cur+=ch;
  }
  out.push(cur);
  return out;
}
const headers=parseCsvLine(lines[0]);
const rows=lines.slice(1).filter(Boolean).map(line=>{
  const values=parseCsvLine(line);
  return Object.fromEntries(headers.map((h,i)=>[h,values[i]??'']));
});
const complete=rows.filter(r =>
  r.participant_id && r.role &&
  Number(r.without_resonance_seconds)>0 && Number(r.with_resonance_seconds)>0 &&
  [r.relevance_1_5,r.novelty_1_5,r.usefulness_1_5].every(v=>Number(v)>=1&&Number(v)<=5) &&
  ['yes','no'].includes(r.would_use_again.toLowerCase())
);
if (complete.length < 3) {
  console.error(`IMPACT STUDY NOT READY: ${complete.length} complete participant(s); at least 3 real participants are required.`);
  process.exit(2);
}
if (complete.length > 5) console.warn(`NOTE: protocol target is 3–5 participants; analyzing all ${complete.length} complete rows.`);

const nums=(key)=>complete.map(r=>Number(r[key]));
const median=values=>{const a=[...values].sort((a,b)=>a-b);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const without=median(nums('without_resonance_seconds'));
const withR=median(nums('with_resonance_seconds'));
const reduction=without>0 ? ((without-withR)/without)*100 : 0;
const again=complete.filter(r=>r.would_use_again.toLowerCase()==='yes').length;
const quotes=complete.filter(r=>r.quote_publishable.toLowerCase()==='yes'&&r.public_quote.trim()).map(r=>({role:r.role,quote:r.public_quote.trim()}));

const summary={
  participant_count:complete.length,
  median_without_resonance_seconds:without,
  median_with_resonance_seconds:withR,
  median_time_reduction_percent:Number(reduction.toFixed(1)),
  average_relevance:Number(mean(nums('relevance_1_5')).toFixed(2)),
  average_novelty:Number(mean(nums('novelty_1_5')).toFixed(2)),
  average_usefulness:Number(mean(nums('usefulness_1_5')).toFixed(2)),
  would_use_again:{yes:again,total:complete.length},
  publishable_quotes:quotes
};
console.log(JSON.stringify(summary,null,2));
