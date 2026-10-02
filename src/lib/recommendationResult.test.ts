import { describe, expect, it } from 'vitest';
import { hasConsistentRecommendationResult, matchesRecommendationRequestContext } from './recommendationResult';

function validResult() {
  return {
    requestContext:{
      anchors:[
        { query:'Ella Fitzgerald' },
        { query:'Italian food' },
      ],
      energy:'calm',
      setting:'small-group',
      durationMinutes:45,
    },
    summary:'Grounded result.',
    resolvedAnchors:[
      {
        query:'Ella Fitzgerald',
        name:'Ella Fitzgerald',
        entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9',
        requestedTypeUrn:undefined as string | undefined,
        resolutionMatch:'exact-name',
      },
      {
        query:'Italian food',
        name:'Italian cuisine',
        entityId:'9A25B172-4795-43E4-B222-3B550DC05AAA',
        requestedTypeUrn:undefined as string | undefined,
        resolutionMatch:'top-result',
      },
    ],
    affinities:[
      { label:'Jazz', score:null as number | null, rank:1 },
      { label:'Musicals', score:null as number | null, rank:2 },
      { label:'Classic cinema', score:null as number | null, rank:3 },
    ],
    plan:[
      { title:'Opening cue', duration:'10 min', action:'A', why:'A', affinityLabel:'Jazz', anchorName:'Ella Fitzgerald' as string | undefined },
      { title:'Story bridge', duration:'10 min', action:'B', why:'B', affinityLabel:'Musicals', anchorName:'Italian cuisine' as string | undefined },
      { title:'Shared choice', duration:'15 min', action:'C', why:'C', affinityLabel:'Classic cinema', anchorName:undefined as string | undefined },
      { title:'Closing ritual', duration:'10 min', action:'D', why:'D', affinityLabel:'Classic cinema', anchorName:undefined as string | undefined },
    ],
    agentTrace:[
      { stage:'resolve', status:'ok', detail:'Resolved.' },
      { stage:'evaluate', status:'ok', detail:'Evaluated.' },
      { stage:'compose', status:'ok', detail:'Composed.' },
      { stage:'explain', status:'warning', detail:'Explained.' },
    ],
    evidence:{
      meanNormalizedScore:null as number | null,
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

describe('live recommendation request binding', () => {
  const expected = {
    anchors:[
      { query:'Ella Fitzgerald' },
      { query:'Italian food' },
    ],
    energy:'calm',
    setting:'small-group',
    durationMinutes:45,
  };

  it('accepts the resolved-anchor subsequence and session context for the submitted request', () => {
    expect(matchesRecommendationRequestContext(validResult(), expected)).toBe(true);
  });

  it('rejects missing or tampered normalized request receipts', () => {
    const missing = validResult();
    delete (missing as { requestContext?: unknown }).requestContext;
    expect(hasConsistentRecommendationResult(missing)).toBe(false);
    expect(matchesRecommendationRequestContext(missing, expected)).toBe(false);

    const wrongEnergy = validResult();
    wrongEnergy.requestContext.energy = 'active';
    expect(hasConsistentRecommendationResult(wrongEnergy)).toBe(false);
    expect(matchesRecommendationRequestContext(wrongEnergy, expected)).toBe(false);

    const wrongAnchor = validResult();
    wrongAnchor.requestContext.anchors[1].query = 'French food';
    expect(hasConsistentRecommendationResult(wrongAnchor)).toBe(false);
    expect(matchesRecommendationRequestContext(wrongAnchor, expected)).toBe(false);
  });

  it('rejects anchors from another request or a reordered response', () => {
    const wrongAnchor = validResult();
    wrongAnchor.resolvedAnchors[1].query = 'French food';
    expect(matchesRecommendationRequestContext(wrongAnchor, expected)).toBe(false);

    const reordered = validResult();
    reordered.resolvedAnchors.reverse();
    expect(matchesRecommendationRequestContext(reordered, expected)).toBe(false);
  });

  it('binds category hints and session-defining context', () => {
    const typed = validResult();
    typed.resolvedAnchors[0].requestedTypeUrn = 'urn:entity:artist';
    expect(matchesRecommendationRequestContext(typed, {
      ...expected,
      anchors:[
        { query:'Ella Fitzgerald', typeUrn:'urn:entity:artist' },
        { query:'Italian food' },
      ],
    })).toBe(true);

    expect(matchesRecommendationRequestContext(typed, expected)).toBe(false);
    expect(matchesRecommendationRequestContext(validResult(), { ...expected, energy:'active' })).toBe(false);
    expect(matchesRecommendationRequestContext(validResult(), { ...expected, setting:'community' })).toBe(false);
    expect(matchesRecommendationRequestContext(validResult(), { ...expected, durationMinutes:60 })).toBe(false);
  });
});

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

  it('rejects semantically duplicate Qloo UUIDs and affinity labels', () => {
    const duplicateEntity = validResult();
    duplicateEntity.resolvedAnchors[1].entityId = duplicateEntity.resolvedAnchors[0].entityId.toLowerCase();
    expect(hasConsistentRecommendationResult(duplicateEntity)).toBe(false);

    const duplicateAffinity = validResult();
    duplicateAffinity.affinities[1].label = ' jazz ';
    expect(hasConsistentRecommendationResult(duplicateAffinity)).toBe(false);
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

  it('rejects selected-signal order that does not match the declared evidence rule', () => {
    const ranked = validResult();
    ranked.evidence.selectedAffinityLabels = ['Musicals','Jazz','Classic cinema'];
    expect(hasConsistentRecommendationResult(ranked)).toBe(false);

    const scored = validResult();
    scored.affinities[0].score = .7;
    scored.affinities[1].score = .9;
    scored.affinities[2].score = .8;
    scored.evidence.evidenceBasis = 'normalized-score';
    scored.evidence.meanNormalizedScore = .8;
    scored.evidence.selectedAffinityLabels = ['Musicals','Classic cinema','Jazz'];
    scored.plan[0].affinityLabel = 'Musicals';
    scored.plan[1].affinityLabel = 'Classic cinema';
    scored.plan[2].affinityLabel = 'Jazz';
    scored.plan[3].affinityLabel = 'Jazz';
    expect(hasConsistentRecommendationResult(scored)).toBe(true);

    scored.evidence.selectedAffinityLabels = ['Jazz','Musicals','Classic cinema'];
    expect(hasConsistentRecommendationResult(scored)).toBe(false);
  });

  it('rejects a numeric evidence mean that does not match selected scores', () => {
    const result = validResult();
    result.affinities[0].score = .9;
    result.affinities[1].score = .8;
    result.affinities[2].score = .7;
    result.evidence.evidenceBasis = 'normalized-score';
    result.evidence.meanNormalizedScore = .75;
    expect(hasConsistentRecommendationResult(result)).toBe(false);
  });

  it('rejects resolution and category counts that do not match the resolved anchors', () => {
    const topCount = validResult();
    topCount.evidence.topResultResolutionCount = 0;
    expect(hasConsistentRecommendationResult(topCount)).toBe(false);

    const categoryCount = validResult();
    categoryCount.evidence.categoryHintCount = 1;
    expect(hasConsistentRecommendationResult(categoryCount)).toBe(false);
  });

  it('rejects plan mappings that drift while preserving counts and totals', () => {
    const wrongSparseReuse = validResult();
    wrongSparseReuse.plan[3].affinityLabel = 'Jazz';
    expect(hasConsistentRecommendationResult(wrongSparseReuse)).toBe(false);

    const swappedKnownAnchors = validResult();
    swappedKnownAnchors.plan[0].anchorName = 'Italian cuisine';
    swappedKnownAnchors.plan[1].anchorName = 'Ella Fitzgerald';
    expect(hasConsistentRecommendationResult(swappedKnownAnchors)).toBe(false);

    const wrongTitle = validResult();
    wrongTitle.plan[0].title = 'Warm-up';
    expect(hasConsistentRecommendationResult(wrongTitle)).toBe(false);

    const sameTotalWrongTimeboxes = validResult();
    sameTotalWrongTimeboxes.plan[0].duration = '5 min';
    sameTotalWrongTimeboxes.plan[1].duration = '15 min';
    expect(hasConsistentRecommendationResult(sameTotalWrongTimeboxes)).toBe(false);
  });

  it('rejects plan durations and signal order that drift from session evidence', () => {
    const badMinutes = validResult();
    badMinutes.plan[0].duration = '5 min';
    expect(hasConsistentRecommendationResult(badMinutes)).toBe(false);

    const wrongOrder = validResult();
    wrongOrder.plan[0].affinityLabel = 'Musicals';
    wrongOrder.plan[1].affinityLabel = 'Jazz';
    expect(hasConsistentRecommendationResult(wrongOrder)).toBe(false);

    const unknownAnchor = validResult();
    unknownAnchor.plan[0].anchorName = 'Unresolved favorite';
    expect(hasConsistentRecommendationResult(unknownAnchor)).toBe(false);
  });

  it('rejects missing or reordered agent stages', () => {
    const result = validResult();
    [result.agentTrace[0], result.agentTrace[1]] = [result.agentTrace[1], result.agentTrace[0]];
    expect(hasConsistentRecommendationResult(result)).toBe(false);
  });
});
