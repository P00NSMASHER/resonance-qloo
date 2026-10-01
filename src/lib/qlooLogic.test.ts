import { describe, expect, it } from 'vitest';
import { extractAffinities, extractResolved, planFromTags } from './qlooLogic';

describe('Qloo parsing', () => {
  it('resolves nested entity URNs', () => {
    expect(extractResolved('Ella Fitzgerald', {
      data: [{ entity: { urn: 'urn:entity:artist:ella', name: 'Ella Fitzgerald' } }]
    })).toEqual({
      query: 'Ella Fitzgerald',
      name: 'Ella Fitzgerald',
      urn: 'urn:entity:artist:ella'
    });
  });

  it('deduplicates and clamps affinities', () => {
    expect(extractAffinities({
      results: [
        { name: 'Jazz', affinity: 1.4 },
        { name: 'jazz', affinity: 0.8 },
        { name: 'Musicals', affinity: -0.2 }
      ]
    })).toEqual([
      { label: 'Jazz', score: 1 },
      { label: 'Musicals', score: 0 }
    ]);
  });

  it('builds four session steps', () => {
    const plan = planFromTags([
      { label:'Jazz', score:.9 },
      { label:'Musicals', score:.8 },
      { label:'Classic cinema', score:.7 },
      { label:'Italian cuisine', score:.6 }
    ], 'social', 'small-group');
    expect(plan).toHaveLength(4);
    expect(plan[0].action).toContain('easy back-and-forth conversation');
  });
});