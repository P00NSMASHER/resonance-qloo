import { describe, expect, it } from 'vitest';
import { rateLimitClientKey } from './clientIdentity';

describe('rate-limit client identity', () => {
  it('uses the proxy-nearest right-most forwarded address', () => {
    const spoofedPrefix = rateLimitClientKey(
      '203.0.113.99, 198.51.100.42',
      '10.0.0.5',
    );
    const expected = rateLimitClientKey(
      '198.51.100.42',
      '10.0.0.5',
    );
    const differentActual = rateLimitClientKey(
      '203.0.113.99, 198.51.100.43',
      '10.0.0.5',
    );

    expect(spoofedPrefix).toBe(expected);
    expect(spoofedPrefix).not.toBe(differentActual);
  });

  it('handles multiple forwarded header values and trims whitespace', () => {
    expect(rateLimitClientKey(
      [' 203.0.113.1 ', ' 198.51.100.9 '],
      '10.0.0.5',
    )).toBe(rateLimitClientKey('198.51.100.9', '10.0.0.5'));
  });

  it('falls back to the socket remote address when forwarding is absent', () => {
    expect(rateLimitClientKey(undefined, '192.0.2.77'))
      .toBe(rateLimitClientKey('', '192.0.2.77'));
  });

  it('does not retain a raw network address in the bucket key', () => {
    const key = rateLimitClientKey('198.51.100.42', '10.0.0.5');
    expect(key).toMatch(/^[0-9a-f]{24}$/);
    expect(key).not.toContain('198.51.100.42');
  });

  it('is stable for the same normalized client address', () => {
    expect(rateLimitClientKey(' 198.51.100.42 ', undefined))
      .toBe(rateLimitClientKey('198.51.100.42', undefined));
  });
});
