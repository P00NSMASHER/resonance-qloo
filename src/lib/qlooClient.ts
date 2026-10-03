import { DEFAULT_QLOO_API_BASE_URL } from './qlooConfig';

export class QlooHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: 'search' | 'insights' | 'probe',
    public readonly explainabilityUnsupported = false,
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
      console.warn(
        `[qloo-upstream] endpoint=${endpoint} status=${response.status} explainabilityRequested=${url.searchParams.has('feature.explainability')}`,
      );
      const responseDetail = (await response.text().catch(() => '')).slice(0, 1_000);
      const normalizedDetail = responseDetail.toLocaleLowerCase('en-US');
      const explainabilityUnsupported =
        endpoint === 'insights' &&
        url.searchParams.has('feature.explainability') &&
        [400, 422].includes(response.status) &&
        (
          normalizedDetail.includes('explainability') ||
          normalizedDetail.includes('feature.explainability')
        );
      throw new QlooHttpError(
        `Qloo ${endpoint} failed (${response.status}).`,
        response.status,
        endpoint,
        explainabilityUnsupported,
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
    return this.request('search', url);
  }

  async tasteAnalysis(entityIds: string[]) {
    const buildUrl = (includeExplainability: boolean) => {
      const url = new URL('/v2/insights', this.baseUrl);
      url.searchParams.set('filter.type', 'urn:tag');
      url.searchParams.set('signal.interests.entities', entityIds.join(','));
      url.searchParams.set('take', '8');
      if (includeExplainability) url.searchParams.set('feature.explainability', 'true');
      return url;
    };

    try {
      return await this.request('insights', buildUrl(true));
    } catch (error) {
      if (!(error instanceof QlooHttpError) || !error.explainabilityUnsupported) throw error;
      return this.request('insights', buildUrl(false));
    }
  }
}
