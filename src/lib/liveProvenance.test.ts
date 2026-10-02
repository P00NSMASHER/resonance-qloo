import { describe, expect, it } from 'vitest';
import { hasVerifiedLiveProvenance } from './liveProvenance';

describe('live Qloo provenance verifier', () => {
  const origin = 'https://hackathon.api.qloo.com';

  it('accepts a qloo-live result only when origin and timestamp are valid', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin)).toBe(true);
  });

  it('rejects illustrative or missing provenance', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'illustrative-demo',
        apiOrigin:origin,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin)).toBe(false);
    expect(hasVerifiedLiveProvenance({}, origin)).toBe(false);
    expect(hasVerifiedLiveProvenance(null, origin)).toBe(false);
  });

  it('rejects an origin mismatch or missing verified status origin', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:'https://api.qloo.com',
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin)).toBe(false);
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, '')).toBe(false);
  });

  it('rejects a missing or invalid generation timestamp', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{ source:'qloo-live', apiOrigin:origin },
    }, origin)).toBe(false);
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        generatedAt:'not-a-date',
      },
    }, origin)).toBe(false);
  });
});
