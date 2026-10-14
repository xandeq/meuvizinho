/**
 * api-refresh.test.ts
 *
 * Regressão do logout fantasma: o backend rotaciona o refresh token e trata
 * reuso como roubo. Vários 401 simultâneos não podem gerar vários /auth/refresh.
 */
import type { AxiosAdapter, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { createApiClient } from '@bairronow/shared-api-client';

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown };

function setup(handler: Handler) {
  let token: string | null = 'old';
  const onUnauthorized = jest.fn();
  const client = createApiClient({
    baseURL: 'https://api.test',
    tokenStore: {
      getAccessToken: () => token,
      setAccessToken: (t) => {
        token = t;
      },
      onUnauthorized,
    },
  });
  const calls: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(`${config.method?.toUpperCase()} ${config.url} ${config.headers?.Authorization ?? ''}`);
    const { status, data } = handler(config);
    const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
    if (status >= 400) {
      const err = Object.assign(new Error(`HTTP ${status}`), { config, response, isAxiosError: true });
      throw err;
    }
    return response;
  };
  client.defaults.adapter = adapter;
  return { client, calls, onUnauthorized, getToken: () => token };
}

describe('createApiClient refresh', () => {
  it('shares one refresh between concurrent 401s', async () => {
    const { client, calls } = setup((config) => {
      if (config.url?.includes('/auth/refresh')) return { status: 200, data: { accessToken: 'new' } };
      return config.headers?.Authorization === 'Bearer new' ? { status: 200, data: { ok: true } } : { status: 401 };
    });

    const results = await Promise.all([
      client.get('/api/v1/map/pins'),
      client.get('/api/v1/map/pois'),
      client.get('/api/v1/profile/me'),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('does not recurse when the refresh itself returns 401', async () => {
    const { client, calls, onUnauthorized } = setup(() => ({ status: 401 }));

    await expect(client.get('/api/v1/feed' as string, {} as AxiosRequestConfig)).rejects.toThrow();

    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
