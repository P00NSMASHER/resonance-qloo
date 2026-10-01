import { describe, expect, it } from 'vitest';
import { orchestrateSession } from './agentPlanner';

const anchors = [
  { query:'Ella Fitzgerald', name:'Ella Fitzgerald', urn:'urn:entity:artist:ella' },
  { query:"Singin' in the Rain", name:"Singin' in the Rain", urn:'urn:entity:movie:rain' },
];

describe('agent planner', () => {
  it('creates a traceable four-step session from ranked evidence', () => {
    const session = orchestrateSession(
      anchors,
      [
        { label:'Jazz', score:.91 },
        { label:'Musicals', score:.84 },
        { label:'Classic cinema', score:.73 },
        { label:'Italian cuisine', score:.65 },
      ],
      'social',
      'small-group',
    );

    expect(session.plan).toHaveLength(4);
    expect(session.agentTrace.map(x => x.stage)).toEqual(['resolve','evaluate','compose','explain']);
    expect(session.evidence.resolvedAnchorCount).toBe(2);
    expect(session.evidence.confidence).toBeGreaterThan(.7);
  });

  it('fails closed when the Qloo signal is too weak', () => {
    expect(() => orchestrateSession(
      anchors,
      [
        { label:'A', score:.1 },
        { label:'B', score:.12 },
        { label:'C', score:.14 },
      ],
      'calm',
      'one-on-one',
    )).toThrow('QLOO_EVIDENCE_TOO_WEAK');
  });
});
