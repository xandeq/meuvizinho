"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/layouts/AuthLayout";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useVerificationPolling } from "@/lib/verification";

export default function PendingPage() {
  const router = useRouter();
  const { status, error } = useVerificationPolling(5000);

  useEffect(() => {
    if (status?.status === "approved") {
      const t = setTimeout(() => router.push("/feed/"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  const current = status?.status ?? "pending";

  return (
    <AuthLayout
      title="Aguardando verificação"
      subtitle="Recebemos seu comprovante"
      illustration="/illustrations/marketplace-local.webp"
    >
      <div className="space-y-5">
        {current === "pending" && (
          <Card bg="muted" padding="md">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="accent">Em analise</Badge>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-label="Carregando"
              />
            </div>
            <p className="text-fg font-medium">
              Documento em analise. Nossa equipe esta revisando seu
              comprovante. Esta página atualiza automaticamente.
            </p>
          </Card>
        )}

        {current === "approved" && (
          <Card bg="muted" padding="md">
            <Badge variant="primary">Aprovado!</Badge>
            <p className="mt-3 font-bold text-fg">
              Bem vindo ao bairro {status?.bairroNome ?? ""}! Redirecionando...
            </p>
          </Card>
        )}

        {current === "rejected" && (
          <Card bg="muted" padding="md">
            <Badge variant="secondary">Rejeitado</Badge>
            <p className="mt-3 font-medium text-fg">
              Seu comprovante foi rejeitado.
            </p>
            {status?.rejectionReason && (
              <p className="mt-1 text-sm text-muted-fg">
                Motivo: {status.rejectionReason}
              </p>
            )}
            <div className="mt-4">
              <Link href="/proof-upload/">
                <Button variant="secondary" fullWidth>
                  Enviar novo comprovante
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {error && (
          <p className="text-sm text-danger font-semibold">{error}</p>
        )}

        <Link
          href="/login/"
          className="block text-center font-semibold text-primary hover:text-primary-hover"
        >
          Sair
        </Link>
      </div>
    </AuthLayout>
  );
}
