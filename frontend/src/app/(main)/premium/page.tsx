"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import Button from "@/components/ui/Button";

interface SubscriptionStatus {
  plan: "free" | "premium";
  planExpiresAt: string | null;
  isOnTrial: boolean;
  isEligibleForTrial: boolean;
  daysRemaining: number | null;
}

// Link do checkout Kiwify — preencher quando o produto de assinatura for criado no painel.
const KIWIFY_CHECKOUT_URL = process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL || "";

const BENEFITS = [
  { title: "Selo Premium ⭐", desc: "Badge exclusivo nos seus anúncios do marketplace." },
  { title: "Apoie o Meu Vizinho", desc: "Sua assinatura mantém a plataforma no ar e sem anúncios de terceiros." },
  { title: "Destaque nos anúncios", desc: "Em breve: seus anúncios com prioridade no bairro." },
  { title: "Alertas em primeira mão", desc: "Em breve: notificações de segurança sem atraso." },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-secondary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PremiumPage() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<SubscriptionStatus>("/api/v1/subscription/status");
      setStatus(res.data);
    } catch {
      setError("Não foi possível carregar seu plano. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function startTrial() {
    setStarting(true);
    setError(null);
    try {
      await api.post("/api/v1/subscription/trial");
      setSuccess("Trial de 14 dias ativado! Aproveite o Premium.");
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Não foi possível ativar o trial. Tente novamente.");
    } finally {
      setStarting(false);
    }
  }

  const isPremium = status?.plan === "premium";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" aria-hidden />
        <h1 className="text-2xl font-bold mb-2">Meu Vizinho Premium</h1>
        <p className="text-white/80 max-w-md">
          Mais destaque, mais alcance e mais recursos para você e seu bairro.
        </p>
      </div>

      {/* Status atual */}
      {loading ? (
        <div className="rounded-2xl border border-border/50 bg-card p-6 mb-6 animate-pulse">
          <div className="h-5 w-40 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      ) : status && (
        <div className="rounded-2xl border border-border/50 bg-card p-6 mb-6" role="status">
          {isPremium ? (
            <>
              <p className="font-semibold text-fg flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-secondary" aria-hidden />
                Plano Premium ativo{status.isOnTrial ? " (trial)" : ""}
              </p>
              <p className="text-sm text-muted-fg mt-1">
                {status.daysRemaining != null && status.daysRemaining > 0
                  ? `${status.daysRemaining} ${status.daysRemaining === 1 ? "dia restante" : "dias restantes"}`
                  : "Expira hoje"}
                {status.planExpiresAt &&
                  ` — até ${new Date(status.planExpiresAt).toLocaleDateString("pt-BR")}`}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-fg">Você está no plano gratuito</p>
              <p className="text-sm text-muted-fg mt-1">
                {status.isEligibleForTrial
                  ? "Experimente o Premium grátis por 14 dias — sem cartão de crédito."
                  : "Seu trial já foi utilizado. Assine para voltar ao Premium."}
              </p>
            </>
          )}
        </div>
      )}

      {/* Mensagens */}
      {success && (
        <div className="rounded-xl bg-secondary-light text-secondary px-4 py-3 mb-4 text-sm font-medium" role="status">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-danger/10 text-danger px-4 py-3 mb-4 text-sm font-medium" role="alert">
          {error}
        </div>
      )}

      {/* Benefícios */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 mb-6">
        <h2 className="font-semibold text-fg mb-4">O que está incluso</h2>
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex gap-3">
              <CheckIcon />
              <div>
                <p className="font-medium text-fg text-sm">{b.title}</p>
                <p className="text-sm text-muted-fg">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      {!loading && status && !isPremium && (
        <div className="space-y-3">
          {status.isEligibleForTrial && (
            <Button fullWidth size="lg" loading={starting} onClick={startTrial}>
              Ativar trial grátis de 14 dias
            </Button>
          )}
          {KIWIFY_CHECKOUT_URL ? (
            <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className="block">
              <Button fullWidth size="lg" variant={status.isEligibleForTrial ? "outline" : "primary"}>
                Assinar Premium
              </Button>
            </a>
          ) : (
            !status.isEligibleForTrial && (
              <p className="text-sm text-muted-fg text-center">
                Assinatura em breve — aguarde novidades.
              </p>
            )
          )}
        </div>
      )}

      {isPremium && !status?.isOnTrial && KIWIFY_CHECKOUT_URL && (
        <p className="text-sm text-muted-fg text-center">
          Sua assinatura renova automaticamente pela Kiwify.
        </p>
      )}
    </div>
  );
}
