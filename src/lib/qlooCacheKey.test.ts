import { describe, expect, it } from 'vitest';
import { qlooSearchCacheKey, qlooTasteCacheKey } from './qlooCacheKey';

const A = 'FCE8B172-4795-43E4-B222-3B550DC05FD9';
const B = '9A25B172-4795-43E4-B222-3B550DC05AAA';

describe('Qloo cache keys', () => {
  it('canonicalizes harmless search query case and whitespace', () => {
    expect(qlooSearchCacheKey('cred',' Ella   Fitzgerald ','urn:entity:artist')).toBe(
      qlooSearchCacheKey('cred','ella fitzgerald','urn:entity:artist'),
    );
  });

  it('keeps category hints distinct in search cache identity', () => {
    expect(qlooSearchCacheKey('cred','Chicago','urn:entity:movie')).not.toBe(
      qlooSearchCacheKey('cred','Chicago','urn:entity:place'),
    );
  });

  it('normalizes UUID casing but preserves exact entity order for taste analysis', () => {
    expect(qlooTasteCacheKey('cred',[A.toLowerCase(),B])).toBe(
      qlooTasteCacheKey('cred',[A,B]),
    );
    expect(qlooTasteCacheKey('cred',[A,B])).not.toBe(
      qlooTasteCacheKey('cred',[B,A]),
    );
  });

  it('keeps credential fingerprints isolated', () => {
    expect(qlooTasteCacheKey('cred-a',[A,B])).not.toBe(
      qlooTasteCacheKey('cred-b',[A,B]),
    );
  });
});
