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
  it('runs the full Qloo-evidence-to-agent-session path', async () => {
    const gateway = gatewayWithTags([
      { name:'Jazz' },
      { name:'Musicals' },
      { name:'Classic cinema' },
      { name:'Italian cuisine' },
    ]);

    const result = await buildRecommendation(gateway, {
      anchors:['Ella Fitzgerald',"Singin' in the Rain"],
      energy:'social',
      setting:'small-group',
    });

    expect(result.resolvedAnchors).toHaveLength(2);
    expect(result.affinities).toHaveLength(4);
    expect(result.evidence.evidenceBasis).toBe('ranked-order');
    expect(result.plan).toHaveLength(4);
    expect(result.agentTrace.map(x => x.stage)).toEqual(['resolve','evaluate','compose','explain']);
    expect(gateway.tasteAnalysis).toHaveBeenCalledWith([uuidA, uuidB]);
  });

  it('fails closed when too few anchors resolve', async () => {
    const gateway: RecommendationGateway = {
      search: vi.fn(async (query: string) => query === 'known'
        ? { results:[{ entity_id:uuidA, name:query }] }
        : { results:[] }),
      tasteAnalysis: vi.fn(async () => ({results:{tags:[]}})),
    };

    await expect(buildRecommendation(gateway, {
      anchors:['known','unknown'],
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
      anchors:['A','B'],
      energy:'calm',
      setting:'one-on-one',
    });

    expect(result.evidence.evidenceBasis).toBe('normalized-score');
    expect(result.evidence.meanNormalizedScore).toBeCloseTo(.8);
  });
});
