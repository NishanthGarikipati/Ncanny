import { ErrorCode, type ApiResponse, type AuthTokens } from '@ncanny/types';
import { ApiError } from './errors';
import { MemoryTokenStore, type TokenStore } from './token-store';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the Authorization header even when a token is available. */
  anonymous?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Internal guard that stops a refreshed request from refreshing again. */
  _retrying?: boolean;
}

export interface HttpClientOptions {
  baseUrl: string;
  tokenStore?: TokenStore;
  /** Injected for tests and for runtimes with a non-global fetch. */
  fetchImpl?: typeof fetch;
  /** Called whenever the session can no longer be recovered, so the app can sign out. */
  onAuthFailure?: () => void;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Thin HTTP layer over the Ncanny REST API.
 *
 * Responsibilities kept here so that feature code never repeats them: envelope
 * unwrapping, error normalisation, bearer-token injection, single-flight token
 * refresh with one retry, timeouts and cancellation.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenStore: TokenStore;
  private readonly fetchImpl: typeof fetch;
  private readonly onAuthFailure?: () => void;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  /** In-flight refresh, shared by every request that hits a 401 concurrently. */
  private refreshInFlight: Promise<AuthTokens | null> | null = null;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.tokenStore = options.tokenStore ?? new MemoryTokenStore();
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error('No fetch implementation available; pass fetchImpl explicitly.');
    }
    this.fetchImpl = fetchImpl;
    this.onAuthFailure = options.onAuthFailure;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  getTokenStore(): TokenStore {
    return this.tokenStore;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options.anonymous) {
      const tokens = await this.tokenStore.get();
      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const onExternalAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onExternalAbort);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (cause) {
      if (options.signal?.aborted) {
        throw ApiError.cancelled();
      }
      throw ApiError.network(
        cause instanceof Error && cause.name === 'AbortError'
          ? 'The request timed out. Please try again.'
          : undefined,
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onExternalAbort);
    }

    if (response.status === 401 && !options.anonymous && !options._retrying) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        return this.request<T>(path, { ...options, _retrying: true });
      }
      this.onAuthFailure?.();
    }

    return this.unwrap<T>(response);
  }

  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Refreshes the token pair at most once concurrently: a burst of parallel
   * requests hitting 401 must not trigger a burst of refresh calls, which would
   * fail rotation detection on the server.
   */
  private async refreshTokens(): Promise<AuthTokens | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<AuthTokens | null> {
    const current = await this.tokenStore.get();
    if (!current?.refreshToken) {
      return null;
    }

    try {
      const tokens = await this.request<AuthTokens>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken: current.refreshToken },
        anonymous: true,
        _retrying: true,
      });
      await this.tokenStore.set(tokens);
      return tokens;
    } catch {
      await this.tokenStore.clear();
      return null;
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (!query) {
      return url;
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    }
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private async unwrap<T>(response: Response): Promise<T> {
    const requestId = response.headers?.get?.('x-request-id') ?? undefined;

    let payload: ApiResponse<T> | undefined;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      payload = undefined;
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (payload.success) {
        return payload.data;
      }
      throw ApiError.fromBody(payload.error, response.status, payload.requestId ?? requestId);
    }

    // A response that is not an Ncanny envelope means something between the
    // client and the API failed (proxy, gateway, or a crashed process).
    throw new ApiError({
      code: response.ok ? ErrorCode.INTERNAL_ERROR : ErrorCode.NETWORK_ERROR,
      message: response.ok
        ? 'Received an unexpected response from Ncanny.'
        : `Request failed with status ${response.status}.`,
      status: response.status,
      requestId,
    });
  }
}
