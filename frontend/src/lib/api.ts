import axios from 'axios';
import {
  createCepApi,
  createVerificationApi,
  createProfileApi,
  createAdminVerificationApi,
} from '@bairronow/shared-api-client';
import { useAuthStore } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const IK_TTL_MS = 5 * 60 * 1000; // 5 min — matches server-side dedup window

function getIdempotencyKey(url: string): string {
  if (typeof window === 'undefined') return crypto.randomUUID();
  const storageKey = `ik:${url}`;
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const { key, ts } = JSON.parse(stored) as { key: string; ts: number };
      if (Date.now() - ts < IK_TTL_MS) return key;
    }
  } catch {
    // sessionStorage unavailable (private mode, storage full)
  }
  const key = crypto.randomUUID();
  try { sessionStorage.setItem(storageKey, JSON.stringify({ key, ts: Date.now() })); } catch { /* ignore */ }
  return key;
}

function clearIdempotencyKey(url: string) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(`ik:${url}`); } catch { /* ignore */ }
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method === 'post' && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = getIdempotencyKey(config.url ?? '');
  }
  return config;
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/register'];

api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'post') {
      clearIdempotencyKey(response.config.url ?? '');
    }
    return response;
  },
  async (error) => {
    const url = error.config?.url ?? '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => url.includes(ep));
    // 403 here isn't a genuine permission denial as often as it looks: our
    // claim-based policies (VerifiedOnly, Admin) bake is_verified/is_admin
    // into the JWT at login time, so a user approved mid-session keeps
    // getting 403 from a stale token until it naturally expires. One
    // refresh-and-retry (guarded by _retry, same as 401) picks up the
    // current claims; if it's a real denial the retry still fails and
    // surfaces normally.
    const shouldRefresh =
      (error.response?.status === 401 || error.response?.status === 403) &&
      !error.config._retry &&
      !isAuthEndpoint;
    if (shouldRefresh) {
      error.config._retry = true;
      try {
        const { data } = await api.post('/api/v1/auth/refresh');
        useAuthStore.getState().setAccessToken(data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(error.config);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/login/';
      }
    }
    return Promise.reject(error);
  }
);

export const cepApi = createCepApi(api);
export const verificationApi = createVerificationApi(api);
export const profileApi = createProfileApi(api);
export const adminVerificationApi = createAdminVerificationApi(api);

export default api;
