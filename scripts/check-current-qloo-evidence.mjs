import {readFile} from 'node:fs/promises';
import {CANONICAL_JUDGE_INPUT, verifyCurrentLiveEvidence} from './current-qloo-evidence-contract.mjs';
const version=JSON.parse(await readFile(new URL('../deployment-contract.json',import.meta.url),'utf8')).version;
const evidence=JSON.parse(await readFile(new URL('../docs/LIVE_QLOO_CURRENT_EVIDENCE.json',import.meta.url),'utf8'));
const result=verifyCurrentLiveEvidence(evidence,version);
if(process.argv.includes('--selftest')){
  const mutate=fn=>JSON.parse(JSON.stringify(fn));
  const shouldFail=(data,label)=>{
    let rejected=false;
    try{verifyCurrentLiveEvidence(data,version);}catch{rejected=true;}
    if(!rejected) throw new Error('Evidence verifier failed to reject '+label);
  };
  let changed=mutate(evidence);
  changed.responseSummary.provenance.source='illustrative';
  shouldFail(changed,'fake live label');
  changed=mutate(evidence);
  changed.responseSummary.evidence.meanNormalizedScore=.99;
  shouldFail(changed,'invented cross-family mean');
  changed=mutate(evidence);
  changed.responseSummary.evidence.selectedAffinityLabels[0]='Invented Qloo';
  shouldFail(changed,'modified Qloo evidence');
  changed=mutate(evidence);
  changed.responseSummary.plan[0].action='Just a generic placeholder.';
  shouldFail(changed,'missing facilitator cue');
  changed=mutate(evidence);
  changed.reviewToken='fake-review-secret';
  shouldFail(changed,'secret-bearing field');
  changed=mutate(evidence);
  changed.responseSummary.plan[0].duration='60 min';
  shouldFail(changed,'false planned duration');
  changed=mutate(evidence);
  changed.request=CANONICAL_JUDGE_INPUT;
  changed.humanStudyClaim='five real participants liked this';
  shouldFail(changed,'invented real-user effectiveness');
  console.log('Current-Qloo strict evidence contract and adversarial mutation self-test passed.');
}else{
  console.log('Current-Qloo frozen public evidence integrity passed:',JSON.stringify(result));
}
