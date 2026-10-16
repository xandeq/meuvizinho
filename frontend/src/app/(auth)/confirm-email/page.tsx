"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import AuthLayout from "@/components/layouts/AuthLayout";

// Destino do link do e-mail de cadastro. Antes a página não existia (404) e nenhum usuário de
// e-mail/senha ficava confirmado — e confirmado é exigido pelo mapa e pelo resumo semanal.
function ConfirmEmail() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState("Link de confirmação inválido.");

  useEffect(() => {
    if (!token) return;
    api
      .post("/api/v1/auth/confirm-email", { token })
      .then(() => setState("ok"))
      .catch((e) => {
        setMessage(apiErrorMessage(e, "Link de confirmação inválido ou expirado."));
        setState("error");
      });
  }, [token]);

  if (state === "loading") return <p className="text-center text-fg/60">Confirmando seu e-mail…</p>;

  return (
    <div className="text-center space-y-4" role={state === "error" ? "alert" : "status"}>
      <p className={state === "ok" ? "text-fg font-semibold" : "text-danger font-semibold"}>
        {state === "ok" ? "E-mail confirmado. Obrigado!" : message}
      </p>
      <Link href={state === "ok" ? "/feed/" : "/login/"} className="inline-block text-primary font-semibold hover:text-primary-hover">
        {state === "ok" ? "Ir para o bairro" : "Voltar ao login"}
      </Link>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <AuthLayout title="Confirmar e-mail" subtitle="Último passo do cadastro">
      <Suspense fallback={<p className="text-center text-fg/60">Carregando...</p>}>
        <ConfirmEmail />
      </Suspense>
    </AuthLayout>
  );
}
