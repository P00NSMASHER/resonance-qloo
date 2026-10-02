import { describe, expect, it } from 'vitest';
import {
  payloadHasMatchingRequestContext,
  readRecommendationRequestContext,
  recommendationRequestContext,
  requestContextsMatch,
} from './recommendationContext';

describe('recommendation request context', () => {
  const expected = {
    anchors:[
      { query:'Ella Fitzgerald', typeUrn:'urn:entity:artist' },
      { query:'Italian food' },
    ],
    energy:'calm',
    setting:'small-group',
    durationMinutes:45,
  };

  it('builds a stable normalized receipt shape from service input', () => {
    expect(recommendationRequestContext({
      anchors:[
        { query:'Ella Fitzgerald', typeUrn:'urn:entity:artist' },
        { query:'Italian food' },
      ],
      energy:'calm',
      setting:'small-group',
    })).toEqual(expected);
  });

  it('accepts harmless query whitespace/case differences but preserves anchor order and type binding', () => {
    const payload = {
      requestContext:{
        anchors:[
          { query:'  ella   FITZGERALD ', typeUrn:'urn:entity:artist' },
          { query:'ITALIAN FOOD' },
        ],
        energy:'calm',
        setting:'small-group',
        durationMinutes:45,
      },
    };
    expect(payloadHasMatchingRequestContext(payload, expected)).toBe(true);

    payload.requestContext.anchors.reverse();
    expect(payloadHasMatchingRequestContext(payload, expected)).toBe(false);
  });

  it('rejects category, energy, setting, and duration drift', () => {
    expect(requestContextsMatch({
      ...expected,
      anchors:[
        { query:'Ella Fitzgerald', typeUrn:'urn:entity:movie' },
        { query:'Italian food' },
      ],
    }, expected)).toBe(false);
    expect(requestContextsMatch({ ...expected, energy:'active' }, expected)).toBe(false);
    expect(requestContextsMatch({ ...expected, setting:'community' }, expected)).toBe(false);
    expect(requestContextsMatch({ ...expected, durationMinutes:60 }, expected)).toBe(false);
  });

  it('rejects malformed receipts instead of coercing them', () => {
    expect(readRecommendationRequestContext({ requestContext:null })).toBeNull();
    expect(readRecommendationRequestContext({
      requestContext:{
        anchors:[{ query:'Ella Fitzgerald' }],
        energy:'calm',
        setting:'small-group',
        durationMinutes:45,
      },
    })).toBeNull();
    expect(readRecommendationRequestContext({
      requestContext:{
        anchors:[
          { query:'Ella Fitzgerald' },
          { query:'Italian food', typeUrn:'' },
        ],
        energy:'calm',
        setting:'small-group',
        durationMinutes:45,
      },
    })).toBeNull();
  });
});
