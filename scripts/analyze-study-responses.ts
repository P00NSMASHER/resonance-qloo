import { readFile } from 'node:fs/promises';
import { STUDY_VERSION, validateStudyResponse, type StudyResponse } from '../src/lib/studyResponse';

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
function parseRows(raw:string) {
  const trimmed=raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const parsed=JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array or JSONL.');
    return parsed;
  }
  return trimmed.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
}
function normalizeLogRow(row:unknown) {
  if (!row || typeof row!=='object') return row;
  const record=row as Record<string,unknown>;
  if (record.studyVersion) return record;
  if (typeof record.message==='string') {
    const marker='RESONANCE_STUDY_RESPONSE ';
    const index=record.message.indexOf(marker);
    if (index>=0) {
      const payload=record.message.slice(index+marker.length).trim();
      return JSON.parse(payload);
    }
  }
  return row;
}

const inputPath=process.argv[2];
if (!inputPath) {
  console.error('Usage: npm run study:analyze -- <private-study-export.jsonl>');
  process.exit(2);
}
const raw=await readFile(inputPath,'utf8');
const parsed=parseRows(raw);
const valid:StudyResponse[]=[];
const invalid:number[]=[];
const seen=new Set<string>();

for (let i=0;i<parsed.length;i++) {
  try {
    const normalized=normalizeLogRow(parsed[i]);
    const response=validateStudyResponse(normalized);
    if (response.studyVersion!==STUDY_VERSION) throw new Error('wrong version');
    if (seen.has(response.responseId)) continue;
    seen.add(response.responseId);
    valid.push(response);
  } catch {
    invalid.push(i+1);
  }
}

const baseline=valid.map(x=>x.baselineSeconds);
const resonance=valid.map(x=>x.resonanceSeconds);
const saved=valid.map(x=>x.baselineSeconds-x.resonanceSeconds);
const pct=valid.map(x=>((x.baselineSeconds-x.resonanceSeconds)/x.baselineSeconds)*100);
const roles=Object.fromEntries(
  [...new Set(valid.map(x=>x.role))].sort().map(role=>[role,valid.filter(x=>x.role===role).length]),
);
const yes=valid.filter(x=>x.wouldUse).length;

const report={
  studyVersion:STUDY_VERSION,
  validSampleSize:valid.length,
  completionThresholdMet:valid.length>=3,
  duplicateIdsRemoved:parsed.length-invalid.length-valid.length,
  invalidRows:invalid,
  roleMix:roles,
  medianBaselineSeconds:median(baseline),
  medianResonanceSeconds:median(resonance),
  medianSecondsSaved:median(saved),
  medianPercentTimeReduction:round(median(pct)),
  meanRelevance:round(mean(valid.map(x=>x.relevance))),
  meanNovelty:round(mean(valid.map(x=>x.novelty))),
  meanUsefulness:round(mean(valid.map(x=>x.usefulness))),
  wouldUseCount:yes,
  wouldUsePercent:valid.length?round((yes/valid.length)*100):null,
  feedbackForManualThematicReview:valid.map(x=>x.feedback),
};

console.log(JSON.stringify(report,null,2));
