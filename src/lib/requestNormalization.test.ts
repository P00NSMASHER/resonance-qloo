import { describe, expect, it } from 'vitest';
import { normalizeRecommendationRequest, recommendationRequestValidationError } from './requestNormalization';

describe('public recommendation request validation', () => {
  it('accepts the documented request shape', () => {
    expect(recommendationRequestValidationError({
      anchors:[
        {query:'Ella Fitzgerald',type:'artist'},
        "Singin' in the Rain",
      ],
      energy:'social',
      setting:'small-group',
      durationMinutes:45,
      confirmedEntityIds:['FCE8B172-4795-43E4-B222-3B550DC05FD9'],
    })).toBeNull();
  });

  it('rejects unsupported fields and out-of-contract anchor arrays', () => {
    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      energy:'calm',
      setting:'small-group',
      surprise:true,
    })).toContain('Unsupported request field');

    expect(recommendationRequestValidationError({
      anchors:['a1','a2','a3','a4','a5'],
      energy:'calm',
      setting:'small-group',
    })).toContain('between 2 and 4');

    expect(recommendationRequestValidationError({
      anchors:[{query:'a1',type:'artist',extra:true},'a2'],
      energy:'calm',
      setting:'small-group',
    })).toContain('only query and type');
  });

  it('rejects missing or invalid required context instead of silently defaulting it', () => {
    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      setting:'small-group',
    })).toContain('energy must be');

    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      energy:'wild',
      setting:'small-group',
    })).toContain('energy must be');

    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      energy:'calm',
      setting:'stadium',
    })).toContain('setting must be');

    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      energy:'calm',
      setting:'small-group',
      durationMinutes:50,
    })).toContain('durationMinutes must be');
  });

  it('rejects malformed explicit Qloo confirmations', () => {
    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      energy:'calm',
      setting:'small-group',
      confirmedEntityIds:['a','b','c','d','e'],
    })).toContain('at most 4');

    expect(recommendationRequestValidationError({
      anchors:['a1','a2'],
      energy:'calm',
      setting:'small-group',
      confirmedEntityIds:[42],
    })).toContain('1–200');
  });
});

describe('recommendation request normalization', () => {
  it('accepts legacy string anchors', () => {
    const result = normalizeRecommendationRequest({
      anchors:[' Ella Fitzgerald ', "Singin' in the Rain"],
      energy:'social',
      setting:'community',
    });

    expect(result).toEqual({
      anchors:[
        {query:'Ella Fitzgerald'},
        {query:"Singin' in the Rain"},
      ],
      energy:'social',
      setting:'community',
      durationMinutes:45,
      confirmedEntityIds:[],
    });
  });

  it('maps category hints to Qloo URNs', () => {
    const result = normalizeRecommendationRequest({
      anchors:[
        {query:'Ella Fitzgerald',type:'artist'},
        {query:"Singin' in the Rain",type:'movie'},
      ],
    });

    expect(result.anchors).toEqual([
      {query:'Ella Fitzgerald',typeUrn:'urn:entity:artist'},
      {query:"Singin' in the Rain",typeUrn:'urn:entity:movie'},
    ]);
  });

  it('drops invalid category values and malformed anchors', () => {
    const result = normalizeRecommendationRequest({
      anchors:[
        {query:'Ella Fitzgerald',type:'fake'},
        {query:'x',type:'artist'},
        123,
        null,
      ],
    });
    expect(result.anchors).toEqual([]);
  });

  it('deduplicates within the same category but permits the same text in different categories', () => {
    const result = normalizeRecommendationRequest({
      anchors:[
        {query:'Chicago',type:'movie'},
        {query:' chicago ',type:'movie'},
        {query:'Chicago',type:'place'},
      ],
    });

    expect(result.anchors).toHaveLength(2);
    expect(result.anchors[0]?.typeUrn).toBe('urn:entity:movie');
    expect(result.anchors[1]?.typeUrn).toBe('urn:entity:place');
  });

  it('accepts only supported session lengths', () => {
    for (const durationMinutes of [30,45,60]) {
      expect(normalizeRecommendationRequest({
        anchors:['a1','a2'],
        durationMinutes,
      }).durationMinutes).toBe(durationMinutes);
    }
    expect(normalizeRecommendationRequest({
      anchors:['a1','a2'],
      durationMinutes:50,
    }).durationMinutes).toBe(45);
  });

  it('normalizes and bounds explicitly confirmed Qloo entity IDs', () => {
    const result = normalizeRecommendationRequest({
      anchors:['a1','a2'],
      confirmedEntityIds:[
        ' FCE8B172-4795-43E4-B222-3B550DC05FD9 ',
        'FCE8B172-4795-43E4-B222-3B550DC05FD9',
        'urn:entity:artist:example',
        42,
        '',
      ],
    });

    expect(result.confirmedEntityIds).toEqual([
      'FCE8B172-4795-43E4-B222-3B550DC05FD9',
      'urn:entity:artist:example',
    ]);
  });

  it('caps anchors at four and defaults invalid context values', () => {
    const result = normalizeRecommendationRequest({
      anchors:['a1','a2','a3','a4','a5'],
      energy:'wild',
      setting:'stadium',
    });

    expect(result.anchors).toHaveLength(4);
    expect(result.energy).toBe('calm');
    expect(result.setting).toBe('small-group');
    expect(result.durationMinutes).toBe(45);
  });
});