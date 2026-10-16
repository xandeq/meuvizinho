import { useEffect, useRef, useState } from 'react';
import type { VerificationStatusDto } from '@bairronow/shared-types';
import { verificationApi } from './api';
import { apiErrorMessage } from './apiError';

export interface PollingResult {
  status: VerificationStatusDto | null;
  loading: boolean;
  error: string | null;
}

export function useVerificationPolling(
  enabled: boolean,
  intervalMs = 5000
): PollingResult {
  const [status, setStatus] = useState<VerificationStatusDto | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!enabled) {
      setLoading(false);
      return;
    }

    const tick = async () => {
      try {
        const next = await verificationApi.getMyStatus();
        if (!cancelled.current) {
          setStatus(next);
          setError(null);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled.current) {
          // Antes mostrava "Network Error" em inglês.
          setError(apiErrorMessage(e, 'Não foi possível consultar o andamento agora.'));
          setLoading(false);
        }
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);

  return { status, loading, error };
}
