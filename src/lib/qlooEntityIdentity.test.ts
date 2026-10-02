import { describe, expect, it } from 'vitest';
import { qlooEntityIdentity } from './qlooEntityIdentity';

describe('Qloo entity identity', () => {
  it('compares UUIDs case-insensitively while preserving non-UUID identifiers', () => {
    expect(qlooEntityIdentity(' FCE8B172-4795-43E4-B222-3B550DC05FD9 ')).toBe(
      'fce8b172-4795-43e4-b222-3b550dc05fd9',
    );
    expect(qlooEntityIdentity('fce8b172-4795-43e4-b222-3b550dc05fd9')).toBe(
      'fce8b172-4795-43e4-b222-3b550dc05fd9',
    );
    expect(qlooEntityIdentity('urn:entity:Artist:Example')).toBe('urn:entity:Artist:Example');
  });
});
