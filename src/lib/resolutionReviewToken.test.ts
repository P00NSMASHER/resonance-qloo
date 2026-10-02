import { describe, expect, it } from 'vitest';
import {
  createResolutionReviewToken,
  resolutionReviewSigningKey,
  verifyResolutionReviewToken,
} from './resolutionReviewToken';

const signingKey = new Uint8Array(32).fill(7);
const baseContext = {
  anchors:[
    { query:'Ella Fitzgerald', typeUrn:'urn:entity:artist' },
    { query:'Italian food' },
  ],
  energy:'calm',
  setting:'small-group',
  durationMinutes:45,
};
const reviewedId = '9A25B172-4795-43E4-B222-3B550DC05AAA';
const now = 1_000_000;

describe('resolution review token', () => {
  it('derives a stable instance-independent signing key from the credential and API origin', () => {
    const first = resolutionReviewSigningKey('event-key', 'https://hackathon.api.qloo.com');
    const second = resolutionReviewSigningKey('event-key', 'https://hackathon.api.qloo.com');
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it('rotates the signing key when the credential or Qloo origin changes', () => {
    const base = resolutionReviewSigningKey('event-key', 'https://hackathon.api.qloo.com');
    const rotatedCredential = resolutionReviewSigningKey('new-event-key', 'https://hackathon.api.qloo.com');
    const differentOrigin = resolutionReviewSigningKey('event-key', 'https://other.example');
    expect(Buffer.from(base).equals(Buffer.from(rotatedCredential))).toBe(false);
    expect(Buffer.from(base).equals(Buffer.from(differentOrigin))).toBe(false);
  });

  it('verifies across server instances sharing the same Qloo credential', () => {
    const origin = 'https://hackathon.api.qloo.com';
    const instanceAKey = resolutionReviewSigningKey('event-credential', origin);
    const instanceBKey = resolutionReviewSigningKey('event-credential', origin);
    const rotatedKey = resolutionReviewSigningKey('rotated-event-credential', origin);
    const token = createResolutionReviewToken(instanceAKey, baseContext, [reviewedId], now);

    expect(verifyResolutionReviewToken(instanceBKey, baseContext, [reviewedId], token, now + 1000)).toBe(true);
    expect(verifyResolutionReviewToken(rotatedKey, baseContext, [reviewedId], token, now + 1000)).toBe(false);
  });


  it('accepts the exact reviewed context and entity set before expiry', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId], now);
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], token, now + 1000)).toBe(true);
  });

  it('rejects a changed anchor with the same entity ID', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId], now);
    const changed = {
      ...baseContext,
      anchors:[baseContext.anchors[0], { query:'Italian restaurants' }],
    };
    expect(verifyResolutionReviewToken(signingKey, changed, [reviewedId], token, now + 1000)).toBe(false);
  });

  it('rejects changed session context or reviewed IDs', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId], now);
    expect(verifyResolutionReviewToken(
      signingKey,
      { ...baseContext, durationMinutes:60 },
      [reviewedId],
      token,
      now + 1000,
    )).toBe(false);
    expect(verifyResolutionReviewToken(
      signingKey,
      baseContext,
      ['FCE8B172-4795-43E4-B222-3B550DC05FD9'],
      token,
      now + 1000,
    )).toBe(false);
  });

  it('rejects expired receipts', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId], now, 5000);
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], token, now + 4999)).toBe(true);
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], token, now + 5000)).toBe(false);
  });

  it('rejects missing or malformed receipts', () => {
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], undefined, now)).toBe(false);
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], 'invalid', now)).toBe(false);
  });
});
