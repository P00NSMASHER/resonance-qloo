import { describe, expect, it, vi } from 'vitest';
import { buildRecommendation, type RecommendationGateway } from './recommendationService';

const uuidA = 'FCE8B172-4795-43E4-B222-3B550DC05FD9';
const uuidB = '9A25B172-4795-43E4-B222-3B550DC05AAA';

function gatewayWithTags(tags: Array<Record<string, unknown>>): RecommendationGateway {
  const ids = [uuidA, uuidB];
  let searchIndex = 0;
  return {
    search: vi.fn(async (query: string) => ({
      results:[{ entity_id:ids[searchIndex++], name:query }],
    })),
    tasteAnalysis: vi.fn(async () => ({
      results:{ tags },
    })),
  };
}

describe('recommendation service', () => {
  it('passes category hints into Qloo resolution', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz' },
      { name:'Musicals' },
      { name:'Classic cinema' },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:[
        {query:'Ella Fitzgerald',typeUrn:'urn:entity:artist'},
        {query:"Singin' in the Rain",typeUrn:'urn:entity:movie'},
      ],
      energy:'social',
      setting:'small-group',
    });

    expect(gateway.search).toHaveBeenNthCalledWith(1,'Ella Fitzgerald','urn:entity:artist');
    expect(gateway.search).toHaveBeenNthCalledWith(2,"Singin' in the Rain",'urn:entity:movie');
    expect(result.resolvedAnchors.map(x => x.requestedTypeUrn)).toEqual([
      'urn:entity:artist',
      'urn:entity:movie',
    ]);
  });

  it('runs the full Qloo-evidence-to-agent-session path', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz' },
      { name:'Musicals' },
      { name:'Classic cinema' },
      { name:'Italian cuisine' },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'Ella Fitzgerald'},{query:"Singin' in the Rain"}],
      energy:'social',
      setting:'small-group',
    });

    expect(result.resolvedAnchors).toHaveLength(2);
    expect(result.affinities).toHaveLength(4);
    expect(result.evidence.evidenceBasis).toBe('ranked-order');
    expect(result.evidence.selectedAffinityLabels).toEqual([
      'Jazz',
      'Musicals',
      'Classic cinema',
      'Italian cuisine',
    ]);
    expect(result.plan).toHaveLength(4);
    expect(result.agentTrace.map(x => x.stage)).toEqual(['resolve','evaluate','compose','explain']);
    expect(gateway.tasteAnalysis).toHaveBeenCalledWith([uuidA, uuidB]);
  });

  it('keeps all returned Qloo evidence while selecting only four plan signals', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz' },
      { name:'Musicals' },
      { name:'Classic cinema' },
      { name:'Italian cuisine' },
      { name:'Broadway' },
      { name:'Swing dance' },
      { name:'Art deco' },
      { name:'Cafe culture' },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'Ella Fitzgerald'},{query:"Singin' in the Rain"}],
      energy:'social',
      setting:'small-group',
    });

    expect(result.affinities).toHaveLength(8);
    expect(result.evidence.returnedAffinityCount).toBe(8);
    expect(result.evidence.selectedAffinityCount).toBe(4);
    expect(result.evidence.selectedAffinityLabels).toEqual([
      'Jazz',
      'Musicals',
      'Classic cinema',
      'Italian cuisine',
    ]);
    expect(result.plan.map(item => item.affinityLabel)).toEqual([
      'Jazz',
      'Musicals',
      'Classic cinema',
      'Italian cuisine',
    ]);
  });

  it('requires explicit confirmation before taste analysis uses a Qloo top result', async () => {
    const gateway: RecommendationGateway = {
      search: vi.fn(async (query: string) => ({
        results:[{
          entity_id:query === 'Italian food' ? uuidB : uuidA,
          name:query === 'Italian food' ? 'Italian cuisine' : query,
        }],
      })),
      tasteAnalysis: vi.fn(async () => ({
        results:{ tags:[
          { name:'Jazz' },
          { name:'Musicals' },
          { name:'Classic cinema' },
        ]},
      })),
    };

    await expect(buildRecommendation(gateway, {
      anchors:[{query:'Ella Fitzgerald'},{query:'Italian food'}],
      energy:'calm',
      setting:'small-group',
    })).rejects.toMatchObject({
      message:'QLOO_RESOLUTION_REVIEW_REQUIRED',
      resolvedAnchors:[
        expect.objectContaining({ entityId:uuidA, resolutionMatch:'exact-name' }),
        expect.objectContaining({ entityId:uuidB, resolutionMatch:'top-result' }),
      ],
    });
    expect(gateway.tasteAnalysis).not.toHaveBeenCalled();

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'Ella Fitzgerald'},{query:'Italian food'}],
      energy:'calm',
      setting:'small-group',
      confirmedEntityIds:[uuidB],
    });

    expect(result.resolvedAnchors.map(item => item.resolutionMatch)).toEqual([
      'exact-name',
      'top-result',
    ]);
    expect(result.evidence.exactResolutionCount).toBe(1);
    expect(result.evidence.topResultResolutionCount).toBe(1);
    expect(result.summary).toContain('1 Qloo top-result match(es) were explicitly confirmed before taste analysis');
    expect(result.agentTrace[0].status).toBe('ok');
    expect(result.agentTrace[0].detail).toContain('explicitly confirmed Qloo top-result match(es)');
    expect(gateway.tasteAnalysis).toHaveBeenCalledOnce();
  });

  it('flows structured favorite-to-Qloo bridges through the service response', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz' },
      { name:'Musicals' },
      { name:'Classic cinema' },
      { name:'Italian cuisine' },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'Ella Fitzgerald'},{query:"Singin' in the Rain"}],
      energy:'social',
      setting:'small-group',
    });

    expect(result.plan[0].anchorName).toBe('Ella Fitzgerald');
    expect(result.plan[0].affinityLabel).toBe('Jazz');
    expect(result.plan[1].anchorName).toBe("Singin' in the Rain");
    expect(result.plan[1].affinityLabel).toBe('Musicals');
  });

  it('grounds the fourth favorite in the closing step', async () => {
    const ids = [
      'FCE8B172-4795-43E4-B222-3B550DC05FD9',
      '9A25B172-4795-43E4-B222-3B550DC05AAA',
      '7B25B172-4795-43E4-B222-3B550DC05AAB',
      '6C25B172-4795-43E4-B222-3B550DC05AAC',
    ];
    let searchIndex = 0;
    const gateway: RecommendationGateway = {
      search: vi.fn(async (query: string) => ({
        results:[{ entity_id:ids[searchIndex++], name:query }],
      })),
      tasteAnalysis: vi.fn(async () => ({
        results:{ tags:[
          { name:'Jazz' },
          { name:'Musicals' },
          { name:'Classic cinema' },
          { name:'Italian cuisine' },
        ]},
      })),
    };

    const result = await buildRecommendation(gateway, {
      anchors:[
        {query:'Ella Fitzgerald'},
        {query:"Singin' in the Rain"},
        {query:'Italian food'},
        {query:'Rome'},
      ],
      energy:'social',
      setting:'small-group',
    });

    expect(result.plan[3].anchorName).toBe('Rome');
    expect(result.plan[3].affinityLabel).toBe('Italian cuisine');
  });

  it('resolves independent anchors concurrently', async () => {
    const releases: Array<() => void> = [];
    let nextId = 0;
    const ids = [uuidA, uuidB];

    const gateway: RecommendationGateway = {
      search: vi.fn((query: string) => new Promise(resolve => {
        const id = ids[nextId++];
        releases.push(() => resolve({ results:[{ entity_id:id, name:query }] }));
      })),
      tasteAnalysis: vi.fn(async () => ({
        results:{ tags:[
          { name:'Jazz' },
          { name:'Musicals' },
          { name:'Classic cinema' },
        ]},
      })),
    };

    const pending = buildRecommendation(gateway, {
      anchors:[{query:'A'},{query:'B'}],
      energy:'calm',
      setting:'small-group',
    });

    expect(gateway.search).toHaveBeenCalledTimes(2);
    releases.forEach(release => release());

    const result = await pending;
    expect(result.resolvedAnchors).toHaveLength(2);
    expect(gateway.tasteAnalysis).toHaveBeenCalledOnce();
  });

  it('flows Qloo explainability metadata through to agent evidence', async () => {
    const ids = [uuidA, uuidB];
    let searchIndex = 0;
    const gateway: RecommendationGateway = {
      search: vi.fn(async (query: string) => ({
        results:[{ entity_id:ids[searchIndex++], name:query }],
      })),
      tasteAnalysis: vi.fn(async () => ({
        query:{ explainability:{ overall:{ anchorA:.7 } } },
        results:{
          tags:[
            { name:'Jazz', query:{ explainability:{ anchorA:.8 } } },
            { name:'Musicals', query:{ explainability:{ anchorB:.6 } } },
            { name:'Classic cinema' },
          ],
        },
      })),
    };

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'A'},{query:'B'}],
      energy:'calm',
      setting:'small-group',
    });

    expect(result.evidence.explainabilityResultCount).toBe(2);
    expect(result.evidence.aggregateExplainabilityAvailable).toBe(true);
    expect(result.agentTrace[3].detail).toContain('Qloo also returned');
  });

  it('surfaces missing Qloo explainability as a warning', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz' },
      { name:'Musicals' },
      { name:'Classic cinema' },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'A'},{query:'B'}],
      energy:'calm',
      setting:'small-group',
    });

    expect(result.evidence.explainabilityResultCount).toBe(0);
    expect(result.evidence.aggregateExplainabilityAvailable).toBe(false);
    expect(result.evidence.selectedAffinityCount).toBe(3);
    expect(result.evidence.returnedAffinityCount).toBe(3);
    expect(result.plan[3].affinityLabel).toBe('Classic cinema');
    expect(result.agentTrace[3].status).toBe('warning');
    expect(result.agentTrace[3].detail).toContain('did not include attribution metadata');
  });

  it('fails closed when too few anchors resolve', async () => {
    const gateway: RecommendationGateway = {
      search: vi.fn(async (query: string) => query === 'known'
        ? { results:[{ entity_id:uuidA, name:query }] }
        : { results:[] }),
      tasteAnalysis: vi.fn(async () => ({results:{tags:[]}})),
    };

    await expect(buildRecommendation(gateway, {
      anchors:[{query:'known'},{query:'unknown'}],
      energy:'calm',
      setting:'one-on-one',
    })).rejects.toThrow('QLOO_EVIDENCE_TOO_SPARSE');

    expect(gateway.tasteAnalysis).not.toHaveBeenCalled();
  });

  it('preserves real Qloo scores through orchestration when present', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz', affinity:.9 },
      { name:'Musicals', affinity:.8 },
      { name:'Classic cinema', affinity:.7 },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:[{query:'A'},{query:'B'}],
      energy:'calm',
      setting:'one-on-one',
    });

    expect(result.evidence.evidenceBasis).toBe('normalized-score');
    expect(result.evidence.meanNormalizedScore).toBeCloseTo(.8);
  });
});
