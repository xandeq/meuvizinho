import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserInfo } from '@bairronow/shared-types';

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  // true quando a sessão caiu sozinha (refresh falhou), não quando o usuário saiu.
  sessionExpired: boolean;
  setAccessToken: (token: string) => void;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  expireSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      sessionExpired: false,
      setAccessToken: (token) => set({ accessToken: token }),
      login: (token, user) => set({ accessToken: token, user, isAuthenticated: true, sessionExpired: false }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false, sessionExpired: false }),
      expireSession: () =>
        set((s) => (s.isAuthenticated ? { accessToken: null, user: null, isAuthenticated: false, sessionExpired: true } : s)),
    }),
    {
      name: 'bairronow-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
