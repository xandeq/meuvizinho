import { useEffect, useState } from 'react';
import { apiClient } from './api';
import { useAuthStore } from './auth-store';

// O login não traz o nome do bairro (UserInfo do backend só tem bairroId),
// então buscamos uma vez em /profile/me e guardamos em memória por bairro.
const cache = new Map<number, string | null>();

export function useBairroName(): string | null {
  const bairroId = useAuthStore((s) => s.user?.bairroId ?? null);
  const fromLogin = useAuthStore((s) => s.user?.bairroName ?? null);
  const [name, setName] = useState<string | null>(fromLogin ?? (bairroId ? cache.get(bairroId) ?? null : null));

  useEffect(() => {
    if (fromLogin || !bairroId) return;
    if (cache.has(bairroId)) {
      setName(cache.get(bairroId) ?? null);
      return;
    }
    let alive = true;
    apiClient
      .get<{ bairroNome?: string | null }>('/api/v1/profile/me')
      .then((r) => {
        const value = r.data?.bairroNome ?? null;
        cache.set(bairroId, value);
        if (alive) setName(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [bairroId, fromLogin]);

  return fromLogin ?? name;
}
