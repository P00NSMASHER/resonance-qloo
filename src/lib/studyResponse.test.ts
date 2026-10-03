import { describe, expect, it } from 'vitest';
import { STUDY_VERSION, validateStudyResponse } from './studyResponse';

const valid = {
  studyVersion:STUDY_VERSION,
  responseId:'123e4567-e89b-12d3-a456-426614174000',
  role:'activity-director',
  baselineSeconds:480,
  resonanceSeconds:90,
  relevance:5,
  novelty:4,
  usefulness:5,
  wouldUse:true,
  feedback:'I would want an easy way to swap one activity.',
  consent:true,
};

describe('study response validation', () => {
  it('accepts bounded anonymous research data', () => {
    expect(validateStudyResponse(valid)).toEqual(valid);
  });

  it('rejects identifiers or contact information in feedback', () => {
    expect(() => validateStudyResponse({...valid,feedback:'Email me at person@example.com'})).toThrow('STUDY_INVALID');
    expect(() => validateStudyResponse({...valid,feedback:'Call 410-555-1212'})).toThrow('STUDY_INVALID');
  });

  it('rejects unknown fields and out-of-range metrics', () => {
    expect(() => validateStudyResponse({...valid,name:'Someone'})).toThrow('STUDY_INVALID');
    expect(() => validateStudyResponse({...valid,relevance:6})).toThrow('STUDY_INVALID');
    expect(() => validateStudyResponse({...valid,baselineSeconds:2})).toThrow('STUDY_INVALID');
  });

  it('requires explicit consent', () => {
    expect(() => validateStudyResponse({...valid,consent:false})).toThrow('STUDY_INVALID');
  });
});
