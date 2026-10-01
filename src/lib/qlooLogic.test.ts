import { describe, expect, it } from 'vitest';
import { extractAffinities, extractResolved, planFromTags } from './qlooLogic';

describe('Qloo parsing', () => {
  it('resolves the UUID entity IDs documented for Qloo signals', () => {
    expect(extractResolved('Ella Fitzgerald', {
      results: [{ entity_id: 'FCE8B172-4795-43E4-B222-3B550DC05FD9', name: 'Ella Fitzgerald' }]
    })).toEqual({
      query: 'Ella Fitzgerald',
      name: 'Ella Fitzgerald',
      entityId: 'FCE8B172-4795-43E4-B222-3B550DC05FD9'
    });
  });

  it('also accepts nested Qloo entity URNs when returned', () => {
    expect(extractResolved('Example', {
      data: [{ entity: { urn: 'urn:entity:artist:example', name: 'Example' } }]
    })).toEqual({
      query: 'Example',
      name: 'Example',
      entityId: 'urn:entity:artist:example'
    });
  });

  it('keeps Qloo result order and never fabricates missing scores', () => {
    expect(extractAffinities({
      results: {
        tags: [
          { tag_id:'urn:tag:keyword:media:jazz', name:'Jazz', query:{} },
          { tag_id:'urn:tag:keyword:media:musicals', name:'Musicals', affinity:1.4 },
          { tag_id:'urn:tag:keyword:media:jazz-duplicate', name:'jazz', affinity:.2 }
        ]
      }
    })).toEqual([
      { label:'Jazz', score:null, rank:1 },
      { label:'Musicals', score:1, rank:2 }
    ]);
  });

  it('builds four session steps from ranked affinities', () => {
    const plan = planFromTags([
      { label:'Jazz', score:null, rank:1 },
      { label:'Musicals', score:null, rank:2 },
      { label:'Classic cinema', score:null, rank:3 },
      { label:'Italian cuisine', score:null, rank:4 }
    ], 'social', 'small-group');
    expect(plan).toHaveLength(4);
    expect(plan[0].action).toContain('easy back-and-forth conversation');
  });
});