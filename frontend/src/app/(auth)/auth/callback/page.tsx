"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";
import type { AuthResponse } from "@bairronow/shared-types";

function CallbackHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // O redirect agora traz só um código de uso único (sem token na URL): troca por XHR, e o cookie de
    // refresh é gravado nessa resposta, na partição do site.
    const code = params.get("code");
    if (code) {
      const exchange = async () => {
        try {
          const { data } = await api.post<AuthResponse>("/api/v1/auth/exchange", { code });
          // Tira o código da barra de endereço/histórico assim que ele foi usado.
          window.history.replaceState(null, "", "/auth/callback/");
          useAuthStore.getState().setAccessToken(data.accessToken);
          login(data.accessToken, data.user);
          router.replace(data.user.isVerified ? "/feed/" : "/cep-lookup/");
        } catch {
          setError("Link de acesso expirado. Entre de novo.");
        }
      };
      exchange();
      return;
    }

    // Compatibilidade com links antigos (?token=) enquanto houver algum em trânsito.
    const token = params.get("token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Token de autenticação ausente.");
      return;
    }

    const completeLogin = async () => {
      try {
        useAuthStore.getState().setAccessToken(token);
        const { data } = await api.get<AuthResponse["user"]>(
          "/api/v1/profile/me"
        );
        login(token, data);
        router.replace("/feed/");
      } catch {
        useAuthStore.getState().setAccessToken(token);
        router.replace("/cep-lookup/");
      }
    };

    completeLogin();
  }, [params, router, login]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-danger font-semibold">{error}</p>
        <a
          href="/login/"
          className="text-primary font-semibold hover:underline"
        >
          Voltar ao login
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-fg/70 font-medium">Autenticando...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-fg/70 font-medium">Autenticando...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
