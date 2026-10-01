import { describe, expect, it } from 'vitest';
import { anchorTypeUrn, isAnchorType } from './anchorTypes';

describe('anchor types', () => {
  it('maps judge-facing categories to documented Qloo URNs', () => {
    expect(anchorTypeUrn('artist')).toBe('urn:entity:artist');
    expect(anchorTypeUrn('movie')).toBe('urn:entity:movie');
    expect(anchorTypeUrn('place')).toBe('urn:entity:place');
  });

  it('keeps any-category searches unfiltered', () => {
    expect(anchorTypeUrn('any')).toBeUndefined();
  });

  it('rejects unknown category values', () => {
    expect(isAnchorType('artist')).toBe(true);
    expect(isAnchorType('made-up')).toBe(false);
  });
});
