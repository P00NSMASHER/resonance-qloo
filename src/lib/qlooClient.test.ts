import { describe, expect, it, vi } from 'vitest';
import { QlooClient, QlooHttpError } from './qlooClient';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('QlooClient', () => {
  it('builds a bounded search request using the documented Qloo endpoint', async () => {
    const mockFetch = vi.fn(async () => ok({ results: [] }));
    const client = new QlooClient('event-key', mockFetch as typeof fetch);

    await client.search('Ella Fitzgerald');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toBe('https://api.qloo.com/search?query=Ella+Fitzgerald&take=5&sort_by=match');
    expect(init?.headers).toEqual({
      'x-api-key': 'event-key',
      accept: 'application/json',
    });
  });

  it('sends resolved Qloo entity IDs into tag taste analysis', async () => {
    const mockFetch = vi.fn(async () => ok({ results: { tags: [] } }));
    const client = new QlooClient('event-key', mockFetch as typeof fetch);

    await client.tasteAnalysis([
      'FCE8B172-4795-43E4-B222-3B550DC05FD9',
      '9A25B172-4795-43E4-B222-3B550DC05AAA',
    ]);

    const [url] = mockFetch.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe('/v2/insights');
    expect(parsed.searchParams.get('filter.type')).toBe('urn:tag');
    expect(parsed.searchParams.get('signal.interests.entities')).toBe(
      'FCE8B172-4795-43E4-B222-3B550DC05FD9,9A25B172-4795-43E4-B222-3B550DC05AAA'
    );
    expect(parsed.searchParams.get('take')).toBe('8');
  });

  it('returns a typed upstream error without exposing the credential', async () => {
    const mockFetch = vi.fn(async () => new Response('{}', { status: 429 }));
    const client = new QlooClient('super-secret', mockFetch as typeof fetch);

    await expect(client.search('test')).rejects.toMatchObject<QlooHttpError>({
      status: 429,
      endpoint: 'search',
    });

    try {
      await client.search('test');
    } catch (error) {
      expect(String(error)).not.toContain('super-secret');
    }
  });
});
