import { describe, expect, it } from 'vitest';
import { formatSessionText } from './sessionExport';

describe('session export', () => {
  const session = {
    requestContext:{
      anchors:[
        { query:'Ella Fitzgerald', typeUrn:'urn:entity:artist' },
        { query:"Singin' in the Rain", typeUrn:'urn:entity:movie' },
      ],
      energy:'social',
      setting:'small-group',
      durationMinutes:45,
    },
    summary:'A grounded session.',
    resolvedAnchors:[
      {query:'Ella',name:'Ella Fitzgerald',entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9',requestedTypeUrn:'urn:entity:artist',resolutionMatch:'top-result' as const},
      {query:"Singin' in the Rain",name:"Singin' in the Rain",entityId:'9A25B172-4795-43E4-B222-3B550DC05AAA',requestedTypeUrn:'urn:entity:movie',resolutionMatch:'exact-name' as const}
    ],
    affinities:[
      {label:'Jazz',score:null,rank:1},
      {label:'Musicals',score:.82,rank:2},
      {label:'Classic cinema',score:null,rank:3},
    ],
    plan:[
      {title:'Opening cue',duration:'10 min',action:'Play a familiar song.',why:'Qloo-ranked evidence.',anchorName:'Ella Fitzgerald',affinityLabel:'Jazz'},
      {title:'Story bridge',duration:'15 min',action:'Invite a story.',why:'Related cultural signal.'},
      {title:'Shared choice',duration:'15 min',action:'Offer choices.',why:'Preserves agency.'},
      {title:'Closing ritual',duration:'10 min',action:'Close gently.',why:'Keeps continuity.'},
    ],
    agentTrace:[
      {stage:'resolve',status:'ok' as const,detail:'Resolved two anchors.'},
      {stage:'evaluate',status:'warning' as const,detail:'Used ranked Qloo evidence.'},
    ],
    provenance:{generatedAt:'2026-10-01T17:12:00.000Z',apiOrigin:'https://hackathon.api.qloo.com',contractVersion:'2026-10-02.review-origin-v1'},
    evidence:{
      evidenceBasis:'ranked-order' as const,
      meanNormalizedScore:null,
      explainabilityResultCount:2,
      aggregateExplainabilityAvailable:true,
      resolvedAnchorCount:2,
      exactResolutionCount:1,
      topResultResolutionCount:1,
      categoryHintCount:2,
      selectedAffinityCount:2,
      returnedAffinityCount:3,
      selectedAffinityLabels:['Jazz','Musicals'],
      sessionDurationMinutes:45,
      energy:'social',
      setting:'small-group',
    },
  };

  it('keeps the non-medical scope in every export', () => {
    expect(formatSessionText(session, 'live')).toContain('Scope: cultural engagement guidance, not medical advice');
    expect(formatSessionText(session, 'demo')).toContain('Scope: cultural engagement guidance, not medical advice');
  });

  it('keeps aggregate-affinity interpretation limits explicit in every export', () => {
    const expected = 'Interpretation limit: Qloo affinities are aggregate cultural signals, not probabilities or claims about an individual';
    expect(formatSessionText(session, 'live')).toContain(expected);
    expect(formatSessionText(session, 'demo')).toContain(expected);
  });

  it('keeps facilitator control explicit in every export', () => {
    const expected = 'Human review: facilitator may accept, modify, reorder, or reject any suggestion';
    expect(formatSessionText(session, 'live')).toContain(expected);
    expect(formatSessionText(session, 'demo')).toContain(expected);
  });

  it('marks illustrative exports so they cannot be mistaken for live Qloo evidence', () => {
    const text = formatSessionText(session, 'demo');
    expect(text).toContain('Illustrative demo — not live Qloo data');
    expect(text).not.toContain('Generated:');
    expect(text).toContain('Jazz: Rank #1');
    expect(text).toContain('Musicals: 82%');
  });

  it('keeps category hints visible in copied/printed session text', () => {
    const text = formatSessionText(session, 'live');
    expect(text).toContain('Ella Fitzgerald [Artist]');
    expect(text).toContain("Singin' in the Rain [Film]");
  });

  it('keeps resolved Qloo IDs in live exports but not demo exports', () => {
    const live = formatSessionText(session, 'live');
    const demo = formatSessionText(session, 'demo');
    expect(live).toContain('Qloo ID: FCE8B172-4795-43E4-B222-3B550DC05FD9');
    expect(demo).not.toContain('Qloo ID:');
  });

  it('keeps illustrative top-result matches marked for review', () => {
    expect(formatSessionText(session, 'demo')).toContain('Resolution: Qloo top result — review');
    expect(formatSessionText(session, 'demo')).not.toContain('Resolution: Qloo top result — explicitly confirmed');
  });

  it('keeps input-to-resolution evidence in live exports', () => {
    const live = formatSessionText(session, 'live');
    expect(live).toContain('Ella -> Ella Fitzgerald [Artist]');
    expect(live).toContain('Resolution: Qloo top result — explicitly confirmed');
    expect(live).toContain("Singin' in the Rain [Film]");
    expect(live).toContain('Resolution: exact name');
  });

  it('keeps the live generation timestamp in exported evidence', () => {
    expect(formatSessionText(session, 'live')).toContain('Generated: 2026-10-01T17:12:00.000Z');
  });

  it('keeps the non-secret Qloo API origin in live exports only', () => {
    expect(formatSessionText(session, 'live')).toContain('Qloo API origin: https://hackathon.api.qloo.com');
    expect(formatSessionText(session, 'demo')).not.toContain('Qloo API origin:');
  });

  it('preserves the normalized submitted request receipt in exports', () => {
    const live = formatSessionText(session, 'live');
    expect(live).toContain('Submitted request context: 45 minutes; energy=social; setting=small-group');
    expect(live).toContain('Submitted anchors: Ella Fitzgerald [Artist] | Singin\' in the Rain [Film]');

    const demo = formatSessionText(session, 'demo');
    expect(demo).toContain('Illustrative request context: 45 minutes; energy=social; setting=small-group');
    expect(demo).toContain('Illustrative anchors: Ella Fitzgerald [Artist] | Singin\' in the Rain [Film]');
  });

  it('keeps the deployment contract in live exports only', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Deployment contract: 2026-10-02.review-origin-v1'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Deployment contract:');
  });

  it('keeps the live evidence basis in exported evidence', () => {
    expect(formatSessionText(session, 'live')).toContain('Evidence basis: Qloo ranked result order');
  });

  it('keeps mean normalized score only when Qloo provided numeric evidence', () => {
    const scored = {
      ...session,
      evidence:{
        ...session.evidence,
        evidenceBasis:'normalized-score' as const,
        meanNormalizedScore:0.81,
      },
    };
    expect(formatSessionText(scored, 'live')).toContain('Mean selected Qloo score: 81%');
    expect(formatSessionText(session, 'live')).not.toContain('Mean selected Qloo score:');
    expect(formatSessionText(scored, 'demo')).not.toContain('Mean selected Qloo score:');
  });

  it('keeps live Qloo explainability status in exported evidence', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Qloo explainability: 2 result(s) with attribution metadata; aggregate metadata present'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Qloo explainability:');
  });

  it('keeps anchor-resolution evidence in live exports', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Resolution evidence: 2 anchor(s) resolved; 1 exact-name match(es); 1 Qloo top-result match(es) explicitly confirmed before taste analysis; 2 category hint(s) used'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Resolution evidence:');
  });

  it('keeps selected-versus-returned affinity evidence in live exports', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Selection evidence: 2 of 3 affinity signal(s) selected for the plan'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Selection evidence:');
  });

  it('uses the first-class returned signal count in live selection evidence', () => {
    const withExplicitReturnedCount = {
      ...session,
      evidence:{ ...session.evidence, returnedAffinityCount:7 },
    };
    expect(formatSessionText(withExplicitReturnedCount, 'live')).toContain(
      'Selection evidence: 2 of 7 affinity signal(s) selected for the plan'
    );
  });

  it('keeps numbered selected Qloo labels in live exports', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Selected Qloo signals: #1 Jazz | #2 Musicals'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Selected Qloo signals:');
  });

  it('distinguishes selected and additional taste evidence in exports', () => {
    const live = formatSessionText(session, 'live');
    expect(live).toContain('[selected Qloo signal #1] Jazz: Rank #1');
    expect(live).toContain('[selected Qloo signal #2] Musicals: 82%');
    expect(live).toContain('[additional Qloo evidence] Classic cinema: Rank #3');

    const demo = formatSessionText(session, 'demo');
    expect(demo).toContain('Illustrative taste evidence:');
    expect(demo).toContain('[example plan signal #1] Jazz: Rank #1');
    expect(demo).toContain('[additional example evidence] Classic cinema: Rank #3');
  });

  it('explains sparse selected-signal reuse instead of implying synthetic evidence', () => {
    const sparse = {
      ...session,
      affinities:[
        {label:'Jazz',score:null,rank:1},
        {label:'Musicals',score:null,rank:2},
        {label:'Classic cinema',score:null,rank:3},
      ],
      plan:[
        {title:'Opening cue',duration:'10 min',action:'Play a familiar song.',why:'Qloo-ranked evidence.',anchorName:'Ella Fitzgerald',affinityLabel:'Jazz'},
        {title:'Story bridge',duration:'10 min',action:'Invite a story.',why:'Related cultural signal.',affinityLabel:'Musicals'},
        {title:'Shared choice',duration:'15 min',action:'Offer choices.',why:'Preserves agency.',affinityLabel:'Classic cinema'},
        {title:'Closing ritual',duration:'10 min',action:'Close gently.',why:'Keeps continuity.',affinityLabel:'Classic cinema'},
      ],
      evidence:{
        ...session.evidence,
        selectedAffinityCount:3,
        returnedAffinityCount:3,
        selectedAffinityLabels:['Jazz','Musicals','Classic cinema'],
      },
    };

    const live = formatSessionText(sparse, 'live');
    expect(live).toContain(
      'Signal reuse: 3 unique selected Qloo signal(s) support 4 activities; the last real selected signal is reused for the closing step instead of inventing synthetic evidence'
    );
    expect(live).toContain('Bridge [Qloo signal #3]: Classic cinema');
  });

  it('keeps target session length in live exports', () => {
    expect(formatSessionText(session, 'live')).toContain('Session target: 45 minutes');
    expect(formatSessionText(session, 'demo')).not.toContain('Session target:');
  });

  it('keeps session energy and setting in live exports', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Session context: energy=social; setting=small-group'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Session context:');
  });

  it('keeps numbered favorite-to-Qloo bridges in exports', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Bridge [Qloo signal #1]: Ella Fitzgerald -> Jazz'
    );
    expect(formatSessionText(session, 'demo')).toContain(
      'Bridge [example signal #1]: Ella Fitzgerald -> Jazz'
    );
  });

  it('keeps the agent decision trace in exports', () => {
    expect(formatSessionText(session, 'live')).toContain('Agent decision trace:');
    expect(formatSessionText(session, 'live')).toContain('- resolve [ok]: Resolved two anchors.');
    expect(formatSessionText(session, 'live')).toContain('- evaluate [warning]: Used ranked Qloo evidence.');
    expect(formatSessionText(session, 'demo')).toContain('Illustrative agent decision trace:');
  });

  it('marks verified live exports as Live Qloo', () => {
    expect(formatSessionText(session, 'live')).toContain('Source: Live Qloo');
  });
});
