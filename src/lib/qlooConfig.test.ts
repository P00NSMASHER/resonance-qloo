import { describe, expect, it } from 'vitest';
import { DEFAULT_QLOO_API_BASE_URL, resolveQlooBaseUrl } from './qlooConfig';

describe('Qloo base URL configuration', () => {
  it('defaults to the event hackathon Qloo API origin', () => {
    expect(resolveQlooBaseUrl(undefined)).toBe(DEFAULT_QLOO_API_BASE_URL);
  });

  it('supports an explicit public Qloo API origin when needed', () => {
    expect(resolveQlooBaseUrl('https://api.qloo.com/'))
      .toBe('https://api.qloo.com');
  });

  it('fails closed on insecure or malformed origins', () => {
    expect(() => resolveQlooBaseUrl('http://api.qloo.com')).toThrow('HTTPS');
    expect(() => resolveQlooBaseUrl('not-a-url')).toThrow('valid HTTPS URL');
    expect(() => resolveQlooBaseUrl('https://user:pass@example.com')).toThrow('clean HTTPS origin');
  });
});
