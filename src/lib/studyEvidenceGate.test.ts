import { describe, expect, it } from 'vitest';
import { STUDY_REVIEW_ATTESTATION, STUDY_REVIEW_MANIFEST_VERSION, reviewedStudyIds } from './studyEvidenceGate';
import { STUDY_VERSION } from './studyResponse';

const row=(id:string)=>({
  responseId:id,
  consentReviewed:true,
  eligibleAdultVerified:true,
  receiptReceived:true,
  liveResonanceVerified:true,
  notFixtureVerified:true,
});
const valid={
  manifestVersion:STUDY_REVIEW_MANIFEST_VERSION,
  source:'anonymous-receipts',
  studyVersion:STUDY_VERSION,
  reviewedOn:'2026-10-08',
  facilitatorAttestation:STUDY_REVIEW_ATTESTATION,
  participants:[row('123e4567-e89b-12d3-a456-426614174000')],
};

describe('private facilitator study review gate',()=>{
  it('requires source-specific explicit review and returns only anonymous receipt ids',()=>{
    expect([...reviewedStudyIds(valid,'anonymous-receipts',STUDY_VERSION)]).toEqual([
      '123e4567-e89b-12d3-a456-426614174000',
    ]);
  });
  it('rejects absent attestation, unreviewed consent, and demo/fixture records',()=>{
    expect(()=>reviewedStudyIds({...valid,facilitatorAttestation:'yes'},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
    expect(()=>reviewedStudyIds({...valid,participants:[{...row('P01'),consentReviewed:false}]},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
    expect(()=>reviewedStudyIds({...valid,participants:[{...row('P01'),notFixtureVerified:false}]},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
  });
  it('rejects duplicate identifiers, extra personal-identification fields, and method drift',()=>{
    expect(()=>reviewedStudyIds({...valid,participants:[row('P01'),row('P01')]},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
    expect(()=>reviewedStudyIds({...valid,participants:[{...row('P01'),name:'Person'}]},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
    expect(()=>reviewedStudyIds(valid,'impact-csv',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
  });
  it('rejects unknown version and malformed review date',()=>{
    expect(()=>reviewedStudyIds({...valid,manifestVersion:'v0'},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
    expect(()=>reviewedStudyIds({...valid,reviewedOn:'yesterday'},'anonymous-receipts',STUDY_VERSION)).toThrow('STUDY_REVIEW_INVALID');
  });
});
