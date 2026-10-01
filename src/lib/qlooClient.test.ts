import { describe, expect, it } from 'vitest';
import { QlooClient } from './qlooClient';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('QlooClient', () => {
  it('probes a lightweight authenticated Qloo endpoint before live mode', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push([input, init]);
      return ok({ results: [] });
    };
    const client = new QlooClient('event-key', mockFetch);

    await expect(client.probe()).resolves.toBe(true);

    const [url, init] = calls[0]!;
    expect(String(url)).toBe('https://api.qloo.com/v2/tags/types?take=1');
    expect(init?.headers).toEqual({
      'x-api-key': 'event-key',
      accept: 'application/json',
    });
  });

  it('builds a bounded generic search request', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push([input, init]);
      return ok({ results: [] });
    };
    const client = new QlooClient('event-key', mockFetch);

    await client.search('Ella Fitzgerald');

    const [url] = calls[0]!;
    expect(String(url)).toBe('https://api.qloo.com/search?query=Ella+Fitzgerald&take=5&sort_by=match');
  });

  it('can constrain resolution to a documented Qloo entity category', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push([input, init]);
      return ok({ results: [] });
    };
    const client = new QlooClient('event-key', mockFetch);

    await client.search("Singin' in the Rain", 'urn:entity:movie');

    const [url] = calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get('query')).toBe("Singin' in the Rain");
    expect(parsed.searchParams.getAll('types')).toEqual(['urn:entity:movie']);
    expect(parsed.searchParams.get('sort_by')).toBe('match');
  });

  it('sends resolved Qloo entity IDs into tag taste analysis and requests explainability', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push([input, init]);
      return ok({ results: { tags: [] } });
    };
    const client = new QlooClient('event-key', mockFetch);

    await client.tasteAnalysis([
      'FCE8B172-4795-43E4-B222-3B550DC05FD9',
      '9A25B172-4795-43E4-B222-3B550DC05AAA',
    ]);

    const [url] = calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe('/v2/insights');
    expect(parsed.searchParams.get('filter.type')).toBe('urn:tag');
    expect(parsed.searchParams.get('signal.interests.entities')).toBe(
      'FCE8B172-4795-43E4-B222-3B550DC05FD9,9A25B172-4795-43E4-B222-3B550DC05AAA'
    );
    expect(parsed.searchParams.get('take')).toBe('8');
    expect(parsed.searchParams.get('feature.explainability')).toBe('true');
  });

  it('returns a typed upstream error without exposing the credential', async () => {
    const mockFetch: typeof fetch = async () => new Response('{}', { status: 429 });
    const client = new QlooClient('super-secret', mockFetch);

    await expect(client.search('test')).rejects.toMatchObject({
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
