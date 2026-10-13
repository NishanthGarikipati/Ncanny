import { ErrorCode, type AuthTokens } from '@ncanny/types';
import { ApiError } from './errors';
import { HttpClient } from './http-client';
import { MemoryTokenStore } from './token-store';

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => 'req-test' },
    json: async () => body,
  }) as unknown as Response;

const tokens = (suffix: string): AuthTokens => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  expiresIn: 900,
  tokenType: 'Bearer',
});

const success = <T>(data: T) => ({ success: true, data, requestId: 'req-test' });
const failure = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, details },
  requestId: 'req-test',
});

describe('HttpClient', () => {
  it('unwraps the success envelope and returns only the data', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, success({ id: '1' })));
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(client.get('/api/v1/thing')).resolves.toEqual({ id: '1' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/api/v1/thing',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches the bearer token when one is stored', async () => {
    const store = new MemoryTokenStore();
    store.set(tokens('1'));
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, success(null)));
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl, tokenStore: store });

    await client.get('/api/v1/auth/me');

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('omits the bearer token for anonymous requests', async () => {
    const store = new MemoryTokenStore();
    store.set(tokens('1'));
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, success(null)));
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl, tokenStore: store });

    await client.get('/api/v1/subjects', { anonymous: true });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('serialises query parameters and drops empty values', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, success([])));
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await client.get('/api/v1/schools', {
      query: { q: 'Ncanny', limit: 10, cursor: undefined, empty: '' },
    });

    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/api/v1/schools?q=Ncanny&limit=10');
  });

  it('converts an error envelope into an ApiError carrying code and field details', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(
          400,
          failure(ErrorCode.VALIDATION_ERROR, 'Validation failed', [
            { field: 'email', message: 'Enter a valid email address' },
          ]),
        ),
      );
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(client.post('/api/v1/auth/login', {})).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      status: 400,
      requestId: 'req-test',
    });

    const error = await client.post('/api/v1/auth/login', {}).catch((e: ApiError) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors.email).toBe('Enter a valid email address');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    const store = new MemoryTokenStore();
    store.set(tokens('old'));

    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, failure(ErrorCode.TOKEN_EXPIRED, 'Token expired')))
      .mockResolvedValueOnce(jsonResponse(200, success(tokens('new'))))
      .mockResolvedValueOnce(jsonResponse(200, success({ id: 'user-1' })));

    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl, tokenStore: store });

    await expect(client.get('/api/v1/auth/me')).resolves.toEqual({ id: 'user-1' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[1][0]).toBe('https://api.test/api/v1/auth/refresh');
    expect(store.get()?.accessToken).toBe('access-new');
    expect(fetchImpl.mock.calls[2][1].headers.Authorization).toBe('Bearer access-new');
  });

  it('refreshes only once when several requests fail concurrently', async () => {
    const store = new MemoryTokenStore();
    store.set(tokens('old'));

    const fetchImpl = jest.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse(200, success(tokens('new'))));
      }
      const authorization = (init.headers as Record<string, string>).Authorization;
      if (authorization === 'Bearer access-old') {
        return Promise.resolve(
          jsonResponse(401, failure(ErrorCode.TOKEN_EXPIRED, 'Token expired')),
        );
      }
      return Promise.resolve(jsonResponse(200, success({ ok: true })));
    });

    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl, tokenStore: store });

    await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

    const refreshCalls = fetchImpl.mock.calls.filter(([url]: [string]) =>
      url.endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('clears tokens and signals the app when the refresh itself fails', async () => {
    const store = new MemoryTokenStore();
    store.set(tokens('old'));
    const onAuthFailure = jest.fn();

    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, failure(ErrorCode.TOKEN_EXPIRED, 'Token expired')))
      .mockResolvedValueOnce(
        jsonResponse(401, failure(ErrorCode.SESSION_REVOKED, 'Session revoked')),
      )
      .mockResolvedValueOnce(jsonResponse(401, failure(ErrorCode.UNAUTHENTICATED, 'Unauthorised')));

    const client = new HttpClient({
      baseUrl: 'https://api.test',
      fetchImpl,
      tokenStore: store,
      onAuthFailure,
    });

    await expect(client.get('/api/v1/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(store.get()).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to refresh when no refresh token is stored', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(401, failure(ErrorCode.UNAUTHENTICATED, 'Unauthorised')));
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(client.get('/api/v1/auth/me')).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports transport failures as network errors', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(client.get('/api/v1/subjects')).rejects.toMatchObject({
      code: ErrorCode.NETWORK_ERROR,
      status: 0,
    });
  });

  it('reports a cancelled request distinctly from a network failure', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(
      client.get('/api/v1/subjects', { signal: controller.signal }),
    ).rejects.toMatchObject({ code: ErrorCode.REQUEST_CANCELLED });
  });

  it('rejects a response that is not an Ncanny envelope', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      // A gateway error page, not an API response.
      {
        status: 502,
        ok: false,
        headers: { get: () => null },
        json: async () => {
          throw new Error('not json');
        },
      } as unknown as Response,
    );
    const client = new HttpClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(client.get('/api/v1/subjects')).rejects.toMatchObject({ status: 502 });
  });
});
