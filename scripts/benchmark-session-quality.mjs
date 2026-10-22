// Synthetic structural/provenance benchmark — NOT real Qloo evidence or a user-outcome evaluation.
// All 20 scenarios are fixed fixtures; unfavorable output causes a nonzero exit.
import { safePlan } from '../src/lib/safePlan.ts';
import { buildAnchorOnlyBaseline } from '../src/lib/qlooDelta.ts';

const scenarios = [["The Hobbit","Kyoto","book","destination","Fiction","Science Fiction & Fantasy"],["Ella Fitzgerald","Roman Holiday","artist","movie","Jazz","Romance"],["Miles Davis","Paris","artist","destination","Jazz","swing"],["Jane Austen","New York","book","destination","Romance","Classics"],["Dune","Tokyo","book","destination","Science Fiction & Fantasy","High Fantasy"],["The Beatles","London","artist","destination","pop","rock"],["Casablanca","Kyoto","movie","destination","Drama","Comedy"],["The Sound of Music","Florence","movie","destination","Musical","Jazz"],["The Great Gatsby","Rome","book","destination","Fiction","Mystery"],["Frida Kahlo","Paris","artist","destination","Jazz","Blues"],["Game of Thrones","Berlin","tv_show","destination","Fantasy","War"],["The Odyssey","Athens","book","place","Classics","Poetry"],["Louis Armstrong","New Orleans","artist","place","Jazz","oldies"],["Harry Potter","Osaka","book","destination","Fantasy","Science Fiction"],["Beyonce","Toronto","artist","place","pop","soul"],["The Godfather","San Francisco","movie","destination","Drama","Crime"],["Pride and Prejudice","Vienna","book","place","Romance","Fiction"],["The Supremes","Napa Valley","artist","destination","soul","Jazz"],["Amelie","Lisbon","movie","destination","Romance","Comedy"],["To Kill a Mockingbird","Dublin","book","destination","Classics","Literature"]];
const results=[];
let failures=0;
for(const [name1,name2,type1,type2,label1,label2] of scenarios){
 const context={anchors:[{query:name1,typeUrn:'urn:entity:'+type1},{query:name2,typeUrn:'urn:entity:'+type2}],energy:'calm',setting:'small-group',durationMinutes:30};
 const baseline=buildAnchorOnlyBaseline(context);
 const draft=[
  {title:'Familiar opening',duration:'5 min',anchorName:name1,affinityLabel:label1,action:'Old positional mapping. Facilitator cue: offer choices and allow anyone to pass.',why:''},
  {title:'Memory bridge',duration:'10 min',anchorName:name2,affinityLabel:label2,action:'Bridge from '+name2+' into '+label2+'. Facilitator cue: offer choices and allow anyone to pass.',why:''},
  {title:'Conversation choice',duration:'10 min',affinityLabel:label1,action:'Facilitator cue: offer choices and allow anyone to pass.',why:''},
  {title:'Recall & close',duration:'5 min',affinityLabel:label2,action:'Facilitator cue: offer choices and allow anyone to pass.',why:''},
 ];
 const plan=safePlan(draft,[name1,name2],[context.anchors[0].typeUrn,context.anchors[1].typeUrn],'calm','small-group');
 const checks={
   complete:plan.length===4 && plan.every(x=>x.action.length>55),
   timed:plan.map(x=>Number.parseInt(x.duration,10)).reduce((a,b)=>a+b,0)===30,
   anchored:plan[0].action.includes(name1) && plan[1].action.includes(name2),
   avoidsPositionalBridge:!plan.some(x=>x.action.includes('Bridge from '+name2+' into '+label2)),
   participation:plan.every(x=>x.action.includes('allow anyone to pass')),
   baselineLiteral:baseline.length===2 && baseline[0].action.includes(name1)&&baseline[1].action.includes(name2),
   unsupportedLinksWithheld:plan[1].affinityLabel!=='' || (!plan[1].action.includes(label2)&&plan[1].why.includes('NOT assigned')),
 };
 const ok=Object.values(checks).every(Boolean);if(!ok)failures++;
 results.push({case:name1+' + '+name2,ok,checks,secondThemeUsed:!!plan[1].affinityLabel});
}
console.log(JSON.stringify({kind:'synthetic-fixture-regression-not-real-user-outcomes',cases:results.length,pass:results.filter(x=>x.ok).length,failed:failures,relativeUsefulness:'not measured',liveQlooRequests:0,labelsIndependent:false},null,2));
if(failures)process.exitCode=1;
