"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { joinGroupByInvite } from "@/lib/api/groups";

function JoinByInvite() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (attempted.current) return;
    attempted.current = true;

    joinGroupByInvite(token)
      .then(({ groupId }) => router.replace(`/groups/${groupId}/`))
      .catch((e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Não foi possível entrar no grupo. O convite pode ter expirado.");
      });
  }, [token, router]);

  const displayError = error ?? (!token ? "Link de convite inválido." : null);

  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      {displayError ? (
        <div className="rounded-2xl border border-border/50 bg-card p-8">
          <p className="font-semibold text-fg mb-2">Convite não aceito</p>
          <p className="text-sm text-muted-fg mb-6" role="alert">{displayError}</p>
          <Link href="/groups/" className="text-sm font-semibold text-primary hover:underline">
            Ver grupos do bairro
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card p-8" role="status">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
          <p className="text-sm text-muted-fg">Entrando no grupo…</p>
        </div>
      )}
    </div>
  );
}

export default function GroupJoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinByInvite />
    </Suspense>
  );
}
