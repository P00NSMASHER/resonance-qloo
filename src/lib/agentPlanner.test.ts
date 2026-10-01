import { describe, expect, it } from 'vitest';
import { orchestrateSession } from './agentPlanner';

const anchors = [
  { query:'Ella Fitzgerald', name:'Ella Fitzgerald', entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9' },
  { query:"Singin' in the Rain", name:"Singin' in the Rain", entityId:'9A25B172-4795-43E4-B222-3B550DC05AAA' },
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
    expect(session.agentTrace.map(x => x.stage)).toEqual(['resolve','evaluate','compose','explain']);
    expect(session.evidence.evidenceBasis).toBe('normalized-score');
    expect(session.evidence.meanNormalizedScore).toBeGreaterThan(.7);
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