import { describe, expect, it } from 'vitest';
import { hasVerifiedLiveProvenance } from './liveProvenance';

describe('live Qloo provenance verifier', () => {
  const origin = 'https://hackathon.api.qloo.com';
  const contractVersion = '2026-10-02.review-origin-v1';

  it('accepts a qloo-live result only when origin and timestamp are valid', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        contractVersion,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin, contractVersion)).toBe(true);
  });

  it('rejects illustrative or missing provenance', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'illustrative-demo',
        apiOrigin:origin,
        contractVersion,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin, contractVersion)).toBe(false);
    expect(hasVerifiedLiveProvenance({}, origin, contractVersion)).toBe(false);
    expect(hasVerifiedLiveProvenance(null, origin, contractVersion)).toBe(false);
  });

  it('rejects an origin mismatch or missing verified status origin', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:'https://api.qloo.com',
        contractVersion,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin, contractVersion)).toBe(false);
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        contractVersion,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, '', contractVersion)).toBe(false);
  });

  it('rejects a deployment contract mismatch', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        contractVersion:'older-contract',
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin, contractVersion)).toBe(false);
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        generatedAt:'2026-10-02T13:00:00.000Z',
      },
    }, origin, contractVersion)).toBe(false);
  });

  it('rejects a missing or invalid generation timestamp', () => {
    expect(hasVerifiedLiveProvenance({
      provenance:{ source:'qloo-live', apiOrigin:origin, contractVersion },
    }, origin, contractVersion)).toBe(false);
    expect(hasVerifiedLiveProvenance({
      provenance:{
        source:'qloo-live',
        apiOrigin:origin,
        contractVersion,
        generatedAt:'not-a-date',
      },
    }, origin, contractVersion)).toBe(false);
  });
});
