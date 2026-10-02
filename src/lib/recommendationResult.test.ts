import { describe, expect, it } from 'vitest';
import { hasConsistentRecommendationResult } from './recommendationResult';

function validResult() {
  return {
    summary:'Grounded result.',
    resolvedAnchors:[
      {
        query:'Ella Fitzgerald',
        name:'Ella Fitzgerald',
        entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9',
        resolutionMatch:'exact-name',
      },
      {
        query:'Italian food',
        name:'Italian cuisine',
        entityId:'9A25B172-4795-43E4-B222-3B550DC05AAA',
        resolutionMatch:'top-result',
      },
    ],
    affinities:[
      { label:'Jazz', score:null, rank:1 },
      { label:'Musicals', score:null, rank:2 },
      { label:'Classic cinema', score:null, rank:3 },
    ],
    plan:[
      { title:'Opening cue', duration:'10 min', action:'A', why:'A', affinityLabel:'Jazz' },
      { title:'Story bridge', duration:'10 min', action:'B', why:'B', affinityLabel:'Musicals' },
      { title:'Shared choice', duration:'15 min', action:'C', why:'C', affinityLabel:'Classic cinema' },
      { title:'Closing ritual', duration:'10 min', action:'D', why:'D', affinityLabel:'Classic cinema' },
    ],
    agentTrace:[
      { stage:'resolve', status:'ok', detail:'Resolved.' },
      { stage:'evaluate', status:'ok', detail:'Evaluated.' },
      { stage:'compose', status:'ok', detail:'Composed.' },
      { stage:'explain', status:'warning', detail:'Explained.' },
    ],
    evidence:{
      meanNormalizedScore:null,
      evidenceBasis:'ranked-order',
      selectedAffinityCount:3,
      returnedAffinityCount:3,
      selectedAffinityLabels:['Jazz','Musicals','Classic cinema'],
      resolvedAnchorCount:2,
      exactResolutionCount:1,
      topResultResolutionCount:1,
      categoryHintCount:0,
      explainabilityResultCount:0,
      aggregateExplainabilityAvailable:false,
      sessionDurationMinutes:45,
      energy:'calm',
      setting:'small-group',
    },
    provenance:{
      source:'qloo-live',
      apiOrigin:'https://hackathon.api.qloo.com',
      generatedAt:'2026-10-02T13:00:00.000Z',
    },
  };
}

describe('live recommendation result integrity', () => {
  it('accepts a structurally and relationally consistent result', () => {
    expect(hasConsistentRecommendationResult(validResult())).toBe(true);
  });

  it('rejects returned and selected signal count mismatches', () => {
    const returnedMismatch = validResult();
    returnedMismatch.evidence.returnedAffinityCount = 4;
    expect(hasConsistentRecommendationResult(returnedMismatch)).toBe(false);

    const selectedMismatch = validResult();
    selectedMismatch.evidence.selectedAffinityCount = 4;
    expect(hasConsistentRecommendationResult(selectedMismatch)).toBe(false);
  });

  it('rejects selected labels that are absent, duplicated, or not represented in the plan', () => {
    const absent = validResult();
    absent.evidence.selectedAffinityLabels = ['Jazz','Musicals','Not returned'];
    expect(hasConsistentRecommendationResult(absent)).toBe(false);

    const duplicate = validResult();
    duplicate.evidence.selectedAffinityLabels = ['Jazz','Jazz','Classic cinema'];
    expect(hasConsistentRecommendationResult(duplicate)).toBe(false);

    const missingFromPlan = validResult();
    missingFromPlan.plan[2].affinityLabel = 'Jazz';
    missingFromPlan.plan[3].affinityLabel = 'Jazz';
    expect(hasConsistentRecommendationResult(missingFromPlan)).toBe(false);
  });

  it('rejects inconsistent resolution accounting', () => {
    const result = validResult();
    result.evidence.exactResolutionCount = 2;
    expect(hasConsistentRecommendationResult(result)).toBe(false);
  });

  it('rejects impossible score and rank evidence', () => {
    const badScore = validResult();
    badScore.affinities[0].score = 1.2;
    expect(hasConsistentRecommendationResult(badScore)).toBe(false);

    const badRank = validResult();
    badRank.affinities[0].rank = 0;
    expect(hasConsistentRecommendationResult(badRank)).toBe(false);

    const mismatchedBasis = validResult();
    mismatchedBasis.evidence.evidenceBasis = 'normalized-score';
    expect(hasConsistentRecommendationResult(mismatchedBasis)).toBe(false);
  });

  it('rejects missing or reordered agent stages', () => {
    const result = validResult();
    [result.agentTrace[0], result.agentTrace[1]] = [result.agentTrace[1], result.agentTrace[0]];
    expect(hasConsistentRecommendationResult(result)).toBe(false);
  });
});
