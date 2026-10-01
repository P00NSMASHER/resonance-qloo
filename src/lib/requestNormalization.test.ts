import { describe, expect, it } from 'vitest';
import { normalizeRecommendationRequest } from './requestNormalization';

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