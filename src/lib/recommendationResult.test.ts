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
      { label:'Jazz', score:null as number | null, rank:1 },
      { label:'Musicals', score:null as number | null, rank:2 },
      { label:'Classic cinema', score:null as number | null, rank:3 },
    ],
    plan:[
      { title:'Opening cue', duration:'10 min', action:'A', why:'A', anchorName:'Ella Fitzgerald', affinityLabel:'Jazz' },
      { title:'Story bridge', duration:'10 min', action:'B', why:'B', anchorName:'Italian cuisine', affinityLabel:'Musicals' },
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
    result.evidence.topResultResolutionCount = 0;
    expect(hasConsistentRecommendationResult(result)).toBe(false);

    const categoryMismatch = validResult();
    categoryMismatch.evidence.categoryHintCount = 1;
    expect(hasConsistentRecommendationResult(categoryMismatch)).toBe(false);
  });

  it('rejects impossible or non-sequential score/rank evidence', () => {
    const badScore = validResult();
    badScore.affinities[0].score = 1.2;
    expect(hasConsistentRecommendationResult(badScore)).toBe(false);

    const badRank = validResult();
    badRank.affinities[1].rank = 4;
    expect(hasConsistentRecommendationResult(badRank)).toBe(false);

    const mismatchedBasis = validResult();
    mismatchedBasis.evidence.evidenceBasis = 'normalized-score';
    expect(hasConsistentRecommendationResult(mismatchedBasis)).toBe(false);
  });

  it('rejects ranked-order selections that do not match Qloo rank order', () => {
    const result = validResult();
    result.evidence.selectedAffinityLabels = ['Musicals','Jazz','Classic cinema'];
    result.plan[0].affinityLabel = 'Musicals';
    result.plan[1].affinityLabel = 'Jazz';
    expect(hasConsistentRecommendationResult(result)).toBe(false);
  });

  it('accepts the real numeric-score selection rule and rejects false score evidence', () => {
    const scored = validResult();
    scored.affinities = [
      { label:'Jazz', score:0.4, rank:1 },
      { label:'Musicals', score:0.9, rank:2 },
      { label:'Classic cinema', score:0.7, rank:3 },
      { label:'Italian cuisine', score:null, rank:4 },
    ];
    scored.evidence.returnedAffinityCount = 4;
    scored.evidence.selectedAffinityCount = 3;
    scored.evidence.selectedAffinityLabels = ['Musicals','Classic cinema','Jazz'];
    scored.evidence.evidenceBasis = 'normalized-score';
    scored.evidence.meanNormalizedScore = (0.9 + 0.7 + 0.4) / 3;
    scored.plan[0].affinityLabel = 'Musicals';
    scored.plan[1].affinityLabel = 'Classic cinema';
    scored.plan[2].affinityLabel = 'Jazz';
    scored.plan[3].affinityLabel = 'Jazz';

    expect(hasConsistentRecommendationResult(scored)).toBe(true);

    const wrongOrder = structuredClone(scored);
    wrongOrder.evidence.selectedAffinityLabels = ['Classic cinema','Musicals','Jazz'];
    wrongOrder.plan[0].affinityLabel = 'Classic cinema';
    wrongOrder.plan[1].affinityLabel = 'Musicals';
    expect(hasConsistentRecommendationResult(wrongOrder)).toBe(false);

    const wrongMean = structuredClone(scored);
    wrongMean.evidence.meanNormalizedScore = 0.5;
    expect(hasConsistentRecommendationResult(wrongMean)).toBe(false);
  });

  it('rejects plan signal order or favorite grounding that diverges from agent evidence', () => {
    const wrongSignalOrder = validResult();
    wrongSignalOrder.plan[0].affinityLabel = 'Musicals';
    wrongSignalOrder.plan[1].affinityLabel = 'Jazz';
    expect(hasConsistentRecommendationResult(wrongSignalOrder)).toBe(false);

    const wrongAnchor = validResult();
    wrongAnchor.plan[0].anchorName = 'Different favorite';
    expect(hasConsistentRecommendationResult(wrongAnchor)).toBe(false);

    const unexpectedAnchor = validResult();
    unexpectedAnchor.plan[3].anchorName = 'Invented favorite';
    expect(hasConsistentRecommendationResult(unexpectedAnchor)).toBe(false);
  });

  it('rejects missing or reordered agent stages', () => {
    const result = validResult();
    [result.agentTrace[0], result.agentTrace[1]] = [result.agentTrace[1], result.agentTrace[0]];
    expect(hasConsistentRecommendationResult(result)).toBe(false);
  });
});
