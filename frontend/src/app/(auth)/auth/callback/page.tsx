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
