import { DEFAULT_QLOO_API_BASE_URL } from './qlooConfig';

export class QlooHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: 'search' | 'insights' | 'probe',
  ) {
    super(message);
  }
}

type FetchLike = typeof fetch;

export class QlooClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly baseUrl = DEFAULT_QLOO_API_BASE_URL,
    private readonly timeoutMs = 8_000,
  ) {}

  private async request(endpoint: 'search' | 'insights' | 'probe', url: URL) {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: {
          'x-api-key': this.apiKey,
          accept: 'application/json',
        },
        redirect:'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('QLOO_TIMEOUT');
      }
      throw error;
    }

    if (!response.ok) {
      throw new QlooHttpError(
        `Qloo ${endpoint} failed (${response.status}).`,
        response.status,
        endpoint,
      );
    }

    return response.json() as Promise<unknown>;
  }

  async probe() {
    const url = new URL('/v2/tags/types', this.baseUrl);
    url.searchParams.set('take', '1');
    await this.request('probe', url);
    return true;
  }

  async search(query: string, entityType?: string) {
    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('query', query);
    if (entityType) url.searchParams.append('types', entityType);
    url.searchParams.set('take', '5');
    url.searchParams.set('sort_by', 'match');
    return this.request('search', url);
  }

  async tasteAnalysis(entityIds: string[]) {
    const url = new URL('/v2/insights', this.baseUrl);
    url.searchParams.set('filter.type', 'urn:tag');
    url.searchParams.set('signal.interests.entities', entityIds.join(','));
    url.searchParams.set('take', '8');
    url.searchParams.set('feature.explainability', 'true');
    return this.request('insights', url);
  }
}
