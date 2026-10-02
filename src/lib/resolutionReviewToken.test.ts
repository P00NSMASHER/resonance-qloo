import { describe, expect, it } from 'vitest';
import {
  createResolutionReviewToken,
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

describe('resolution review token', () => {
  it('accepts the exact reviewed context and entity set', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId]);
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], token)).toBe(true);
  });

  it('rejects a changed anchor with the same entity ID', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId]);
    const changed = {
      ...baseContext,
      anchors:[baseContext.anchors[0], { query:'Italian restaurants' }],
    };
    expect(verifyResolutionReviewToken(signingKey, changed, [reviewedId], token)).toBe(false);
  });

  it('rejects changed session context or reviewed IDs', () => {
    const token = createResolutionReviewToken(signingKey, baseContext, [reviewedId]);
    expect(verifyResolutionReviewToken(
      signingKey,
      { ...baseContext, durationMinutes:60 },
      [reviewedId],
      token,
    )).toBe(false);
    expect(verifyResolutionReviewToken(
      signingKey,
      baseContext,
      ['FCE8B172-4795-43E4-B222-3B550DC05FD9'],
      token,
    )).toBe(false);
  });

  it('rejects missing or malformed receipts', () => {
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], undefined)).toBe(false);
    expect(verifyResolutionReviewToken(signingKey, baseContext, [reviewedId], 'invalid')).toBe(false);
  });
});
