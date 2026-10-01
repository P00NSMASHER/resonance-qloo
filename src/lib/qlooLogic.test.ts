import { describe, expect, it } from 'vitest';
import { extractAffinities, extractExplainabilitySummary, extractResolved, planFromTags } from './qlooLogic';

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

  it('reports Qloo explainability presence without interpreting attribution details', () => {
    expect(extractExplainabilitySummary({
      query:{ explainability:{ top_3:{ inputA:.7 } } },
      results:{
        tags:[
          { name:'Jazz', query:{ explainability:{ inputA:.8 } } },
          { name:'Musicals', query:{} },
          { name:'Classic cinema', query:{ explainability:{ inputB:.4 } } },
        ],
      },
    })).toEqual({ resultCount:2, aggregateAvailable:true });

    expect(extractExplainabilitySummary({
      results:{ tags:[{name:'Jazz'},{name:'Musicals'}] },
    })).toEqual({ resultCount:0, aggregateAvailable:false });
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

  it('keeps supplied favorites visible while branching into Qloo evidence', () => {
    const plan = planFromTags([
      { label:'Classic jazz vocals', score:null, rank:1 },
      { label:'Golden Age musicals', score:null, rank:2 },
      { label:'Mid-century elegance', score:null, rank:3 },
      { label:'Italian-American comfort', score:null, rank:4 }
    ], 'calm', 'small-group', [
      'Ella Fitzgerald',
      "Singin' in the Rain",
      'Italian cuisine',
    ]);

    expect(plan[0].action).toContain('Ella Fitzgerald');
    expect(plan[0].why).toContain('Classic jazz vocals');
    expect(plan[1].action).toContain("Singin' in the Rain");
    expect(plan[1].action).toContain('Golden Age musicals');
    expect(plan[2].action).toContain('Italian cuisine');
    expect(plan[2].action).toContain('Mid-century elegance');
  });
});