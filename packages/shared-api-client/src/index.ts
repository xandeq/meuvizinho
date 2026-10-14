import axios, { AxiosInstance } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  CepLookupResult,
  VerificationStatusDto,
  AdminVerificationListItem,
  ProfileDto,
  UpdateProfileRequest,
} from '@bairronow/shared-types';

export interface TokenStore {
  getAccessToken: () => string | null;
  setAccessToken: (token: string) => void;
  onUnauthorized: () => void;
}

export interface ClientOptions {
  baseURL: string;
  tokenStore: TokenStore;
}

const REFRESH_PATH = '/api/v1/auth/refresh';
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register'];

export function createApiClient({ baseURL, tokenStore }: ClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = tokenStore.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Um refresh por vez. O backend rotaciona o refresh token e trata reuso como
  // roubo (revoga todos): 401s simultâneos (ex.: mapa pedindo pins + POIs)
  // disparavam vários /auth/refresh com o mesmo cookie e o segundo derrubava
  // a sessão do usuário.
  let refreshing: Promise<string> | null = null;
  const refreshOnce = () => {
    if (!refreshing) {
      refreshing = client
        .post<{ accessToken: string }>(REFRESH_PATH)
        .then(({ data }) => {
          tokenStore.setAccessToken(data.accessToken);
          return data.accessToken;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  };

  client.interceptors.response.use(
    (r) => r,
    async (error) => {
      const original = error.config;
      const isAuthCall = AUTH_PATHS.some((p) => (original?.url ?? '').includes(p));
      // Nunca tenta refresh em cima do próprio refresh/login (antes: recursão).
      if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
        original._retry = true;
        try {
          const token = await refreshOnce();
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        } catch {
          tokenStore.onUnauthorized();
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export function createAuthApi(client: AxiosInstance) {
  return {
    login: (body: LoginRequest) =>
      client.post<AuthResponse>('/api/v1/auth/login', body).then((r) => r.data),
    register: (body: RegisterRequest) =>
      client.post<AuthResponse>('/api/v1/auth/register', body).then((r) => r.data),
    logout: () => client.post('/api/v1/auth/logout'),
    forgotPassword: (body: ForgotPasswordRequest) =>
      client.post('/api/v1/auth/forgot-password', body),
    resetPassword: (body: ResetPasswordRequest) =>
      client.post('/api/v1/auth/reset-password', body),
  };
}

export function createCepApi(client: AxiosInstance) {
  return {
    lookup: async (raw: string): Promise<CepLookupResult> => {
      const clean = raw.replace(/\D/g, '');
      const { data } = await client.get<CepLookupResult>('/api/v1/cep/' + clean);
      return data;
    },
  };
}

export function createVerificationApi(client: AxiosInstance) {
  return {
    submit: async (formData: FormData): Promise<VerificationStatusDto> => {
      const { data } = await client.post<VerificationStatusDto>(
        '/api/v1/verification',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    getMyStatus: async (): Promise<VerificationStatusDto> => {
      const { data } = await client.get<VerificationStatusDto>('/api/v1/verification/me');
      return data;
    },
  };
}

export function createProfileApi(client: AxiosInstance) {
  return {
    getMe: async (): Promise<ProfileDto> => {
      const { data } = await client.get<ProfileDto>('/api/v1/profile/me');
      return data;
    },
    updateMe: async (body: UpdateProfileRequest): Promise<ProfileDto> => {
      const { data } = await client.put<ProfileDto>('/api/v1/profile/me', body);
      return data;
    },
  };
}

export function createAdminVerificationApi(client: AxiosInstance) {
  return {
    listPending: async (
      skip = 0,
      take = 20
    ): Promise<{ items: AdminVerificationListItem[]; total: number }> => {
      const { data } = await client.get<
        AdminVerificationListItem[] | { items: AdminVerificationListItem[]; total: number }
      >('/api/v1/admin/verifications', { params: { status: 'pending', skip, take } });
      // API currently returns a bare array; tolerate both shapes.
      if (Array.isArray(data)) {
        return { items: data, total: data.length };
      }
      return { items: data.items ?? [], total: data.total ?? 0 };
    },
    approve: async (id: number): Promise<void> => {
      // Send explicit empty JSON body so IIS sets Content-Length and does
      // not reject the request with HTTP 411 "Length Required".
      await client.post('/api/v1/admin/verifications/' + id + '/approve', {});
    },
    reject: async (id: number, reason: string): Promise<void> => {
      await client.post('/api/v1/admin/verifications/' + id + '/reject', { reason });
    },
    getProofUrl: (id: number): string => {
      const base = (client.defaults.baseURL || '').replace(/\/$/, '');
      return base + '/api/v1/admin/verifications/' + id + '/proof';
    },
  };
}

export { createFeedClient } from './feed';
export type { FeedClient, ListFeedParams, ResolveReportParams } from './feed';

export type { AxiosInstance };
