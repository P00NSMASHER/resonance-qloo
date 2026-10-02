import { describe, expect, it } from 'vitest';
import { extractAffinities, extractExplainabilitySummary, extractResolved, planFromTags } from './qlooLogic';

describe('Qloo parsing', () => {
  it('resolves the UUID entity IDs documented for Qloo signals', () => {
    expect(extractResolved('Ella Fitzgerald', {
      results: [{ entity_id: 'FCE8B172-4795-43E4-B222-3B550DC05FD9', name: 'Ella Fitzgerald' }]
    })).toEqual({
      query: 'Ella Fitzgerald',
      name: 'Ella Fitzgerald',
      entityId: 'FCE8B172-4795-43E4-B222-3B550DC05FD9',
      resolutionMatch: 'exact-name'
    });
  });

  it('also accepts nested Qloo entity URNs when returned', () => {
    expect(extractResolved('Example', {
      data: [{ entity: { urn: 'urn:entity:artist:example', name: 'Example' } }]
    })).toEqual({
      query: 'Example',
      name: 'Example',
      entityId: 'urn:entity:artist:example',
      resolutionMatch: 'exact-name'
    });
  });

  it('marks a renamed first result as a Qloo top-result match without inventing confidence', () => {
    expect(extractResolved('Italian food', {
      results: [{ entity_id:'FCE8B172-4795-43E4-B222-3B550DC05FD9', name:'Italian cuisine' }],
    })).toEqual({
      query:'Italian food',
      name:'Italian cuisine',
      entityId:'FCE8B172-4795-43E4-B222-3B550DC05FD9',
      resolutionMatch:'top-result',
    });
  });

  it('normalizes punctuation and casing before calling a name exact', () => {
    expect(extractResolved("Singin' in the Rain", {
      results: [{ entity_id:'FCE8B172-4795-43E4-B222-3B550DC05FD9', name:'SINGIN’ IN THE RAIN' }],
    })?.resolutionMatch).toBe('exact-name');
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

  it('prefers documented results.tags over unrelated nested arrays', () => {
    const payload = {
      data:[{ name:'Wrong array', affinity:.99 }],
      results:{
        tags:[
          { name:'Jazz', affinity:.8, query:{ explainability:{ inputA:.7 } } },
          { name:'Musicals', affinity:.6 },
        ],
      },
    };

    expect(extractAffinities(payload).map(x => x.label)).toEqual(['Jazz','Musicals']);
    expect(extractExplainabilitySummary(payload)).toEqual({
      resultCount:1,
      aggregateAvailable:false,
    });
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

  it('reuses the last real Qloo signal when only three affinities are available', () => {
    const plan = planFromTags([
      { label:'Jazz', score:null, rank:1 },
      { label:'Musicals', score:null, rank:2 },
      { label:'Classic cinema', score:null, rank:3 },
    ], 'calm', 'small-group');

    expect(plan).toHaveLength(4);
    expect(plan[2].affinityLabel).toBe('Classic cinema');
    expect(plan[3].affinityLabel).toBe('Classic cinema');
    expect(plan[3].affinityLabel).not.toBe('comforting ritual');
    expect(plan[3].why).toContain('selected Qloo evidence');
  });

  it('exposes structured favorite-to-Qloo bridge metadata', () => {
    const plan = planFromTags([
      { label:'Classic jazz vocals', score:null, rank:1 },
      { label:'Golden Age musicals', score:null, rank:2 },
      { label:'Mid-century elegance', score:null, rank:3 },
      { label:'Italian-American comfort', score:null, rank:4 }
    ], 'calm', 'small-group', [
      'Ella Fitzgerald',
      "Singin' in the Rain",
      'Italian cuisine',
      'Paris',
    ]);

    expect(plan.map(x => x.affinityLabel)).toEqual([
      'Classic jazz vocals',
      'Golden Age musicals',
      'Mid-century elegance',
      'Italian-American comfort',
    ]);
    expect(plan.map(x => x.anchorName)).toEqual([
      'Ella Fitzgerald',
      "Singin' in the Rain",
      'Italian cuisine',
      'Paris',
    ]);
  });

  it('grounds all four stages when four favorites are supplied', () => {
    const plan = planFromTags([
      { label:'Classic jazz vocals', score:null, rank:1 },
      { label:'Golden Age musicals', score:null, rank:2 },
      { label:'Mid-century elegance', score:null, rank:3 },
      { label:'Italian-American comfort', score:null, rank:4 }
    ], 'calm', 'small-group', [
      'Ella Fitzgerald',
      "Singin' in the Rain",
      'Italian cuisine',
      'Paris',
    ]);

    expect(plan[3].action).toContain('Paris');
    expect(plan[3].action).toContain('Italian-American comfort');
    expect(plan[3].why).toContain('Paris');
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