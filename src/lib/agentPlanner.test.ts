import { describe, expect, it } from 'vitest';
import { orchestrateSession } from './agentPlanner';

const anchors = [
  { query:'Ella Fitzgerald', name:'Ella Fitzgerald', entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9', requestedTypeUrn:'urn:entity:artist' },
  { query:"Singin' in the Rain", name:"Singin' in the Rain", entityId:'9A25B172-4795-43E4-B222-3B550DC05AAA', requestedTypeUrn:'urn:entity:movie' },
];

describe('agent planner', () => {
  it('uses real numeric scores when Qloo supplies enough of them', () => {
    const session = orchestrateSession(
      anchors,
      [
        { label:'Jazz', score:.91, rank:1 },
        { label:'Musicals', score:.84, rank:2 },
        { label:'Classic cinema', score:.73, rank:3 },
        { label:'Italian cuisine', score:.65, rank:4 },
      ],
      'social',
      'small-group',
    );

    expect(session.plan).toHaveLength(4);
    expect(session.plan[0].action).toContain('Ella Fitzgerald');
    expect(session.plan[1].action).toContain("Singin' in the Rain");
    expect(session.agentTrace.map(x => x.stage)).toEqual(['resolve','evaluate','compose','explain']);
    expect(session.evidence.evidenceBasis).toBe('normalized-score');
    expect(session.evidence.meanNormalizedScore).toBeGreaterThan(.7);
    expect(session.evidence.categoryHintCount).toBe(2);
    expect(session.evidence.sessionDurationMinutes).toBe(45);
    expect(session.evidence.energy).toBe('social');
    expect(session.evidence.setting).toBe('small-group');
    expect(session.agentTrace[0].detail).toContain('2 used an explicit category hint');
    expect(session.agentTrace[2].detail).toContain('resolved favorites visible');
  });

  it('scales the four timeboxes to the selected session length', () => {
    const tags = [
      { label:'Jazz', score:null, rank:1 },
      { label:'Musicals', score:null, rank:2 },
      { label:'Classic cinema', score:null, rank:3 },
      { label:'Italian cuisine', score:null, rank:4 },
    ];

    const short = orchestrateSession(anchors, tags, 'calm', 'small-group', undefined, 30);
    expect(short.plan.map(x => x.duration)).toEqual(['5 min','10 min','10 min','5 min']);
    expect(short.evidence.sessionDurationMinutes).toBe(30);

    const long = orchestrateSession(anchors, tags, 'calm', 'small-group', undefined, 60);
    expect(long.plan.map(x => x.duration)).toEqual(['10 min','20 min','20 min','10 min']);
    expect(long.evidence.sessionDurationMinutes).toBe(60);
  });

  it('exposes Qloo explainability availability without inventing attribution', () => {
    const session = orchestrateSession(
      anchors,
      [
        { label:'Jazz', score:null, rank:1 },
        { label:'Musicals', score:null, rank:2 },
        { label:'Classic cinema', score:null, rank:3 },
      ],
      'calm',
      'small-group',
      { resultCount:2, aggregateAvailable:true },
    );

    expect(session.evidence.explainabilityResultCount).toBe(2);
    expect(session.evidence.aggregateExplainabilityAvailable).toBe(true);
    expect(session.agentTrace[3].detail).toContain('2 taste result(s)');
    expect(session.agentTrace[3].detail).toContain('aggregate explainability');
  });

  it('uses Qloo rank order without manufacturing scores', () => {
    const session = orchestrateSession(
      anchors,
      [
        { label:'Jazz', score:null, rank:1 },
        { label:'Musicals', score:null, rank:2 },
        { label:'Classic cinema', score:null, rank:3 },
        { label:'Italian cuisine', score:null, rank:4 },
      ],
      'calm',
      'one-on-one',
    );

    expect(session.evidence.evidenceBasis).toBe('ranked-order');
    expect(session.evidence.meanNormalizedScore).toBeNull();
    expect(session.agentTrace[1].detail).toContain('No numeric score was invented');
  });

  it('fails closed when explicit numeric evidence is weak', () => {
    expect(() => orchestrateSession(
      anchors,
      [
        { label:'A', score:.1, rank:1 },
        { label:'B', score:.12, rank:2 },
        { label:'C', score:.14, rank:3 },
      ],
      'calm',
      'one-on-one',
    )).toThrow('QLOO_EVIDENCE_TOO_WEAK');
  });
});