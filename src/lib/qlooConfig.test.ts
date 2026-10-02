import { describe, expect, it } from 'vitest';
import { DEFAULT_QLOO_API_BASE_URL, resolveQlooBaseUrl } from './qlooConfig';

describe('Qloo base URL configuration', () => {
  it('defaults to the event hackathon Qloo API origin', () => {
    expect(resolveQlooBaseUrl(undefined)).toBe(DEFAULT_QLOO_API_BASE_URL);
  });

  it('supports only the documented Qloo API origins by default', () => {
    expect(resolveQlooBaseUrl('https://api.qloo.com/'))
      .toBe('https://api.qloo.com');
    expect(resolveQlooBaseUrl('https://hackathon.api.qloo.com/'))
      .toBe('https://hackathon.api.qloo.com');
    expect(() => resolveQlooBaseUrl('https://example.com'))
      .toThrow('trusted Qloo API origin');
    expect(() => resolveQlooBaseUrl('https://evil.qloo.com'))
      .toThrow('trusted Qloo API origin');
  });

  it('allows loopback HTTPS only behind the explicit local-mock flag', () => {
    expect(() => resolveQlooBaseUrl('https://127.0.0.1:9443'))
      .toThrow('trusted Qloo API origin');
    expect(resolveQlooBaseUrl('https://127.0.0.1:9443', true))
      .toBe('https://127.0.0.1:9443');
    expect(resolveQlooBaseUrl('https://localhost:9443', true))
      .toBe('https://localhost:9443');
  });

  it('fails closed on insecure or malformed origins', () => {
    expect(() => resolveQlooBaseUrl('http://api.qloo.com')).toThrow('HTTPS');
    expect(() => resolveQlooBaseUrl('not-a-url')).toThrow('valid HTTPS URL');
    expect(() => resolveQlooBaseUrl('https://user:pass@example.com')).toThrow('clean HTTPS origin');
    expect(() => resolveQlooBaseUrl('https://hackathon.api.qloo.com/v2')).toThrow('clean HTTPS origin');
  });
});
