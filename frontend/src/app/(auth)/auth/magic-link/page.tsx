"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import AuthLayout from "@/components/layouts/AuthLayout";

function MagicLinkForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "invalid"
      ? "Link invalido ou expirado. Tente novamente."
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/magic-link/request", { email });
      setSent(true);
    } catch {
      setError("Erro ao enviar link. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Link enviado"
        subtitle="Verifique sua caixa de entrada"
      >
        <div className="text-center space-y-4">
          <p className="text-fg/70 font-medium">
            Se o email existir, enviamos um link de acesso. Verifique sua caixa
            de entrada.
          </p>
          <Link
            href="/login/"
            className="inline-block text-primary font-semibold hover:text-primary-hover"
          >
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Entrar sem senha"
      subtitle="Receba um link de acesso por e-mail"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="email"
          name="email"
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && (
          <p className="text-sm text-danger font-semibold">{error}</p>
        )}

        <Button type="submit" loading={loading} fullWidth>
          Enviar link de acesso
        </Button>

        <div className="text-center">
          <Link
            href="/login/"
            className="text-sm text-primary hover:text-primary-hover font-semibold"
          >
            Voltar ao login com senha
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-fg/70 font-medium">Carregando...</p>
        </div>
      }
    >
      <MagicLinkForm />
    </Suspense>
  );
}
