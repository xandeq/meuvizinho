'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getSecurityAlerts, upvoteSecurityAlert } from '@/lib/api/community';
import type { SecurityAlertSummary, SecurityAlertKind } from '@/lib/types/community';
import {
  SECURITY_ALERT_KIND_LABELS,
  SECURITY_ALERT_KIND_EMOJI,
} from '@/lib/types/community';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const KIND_FILTERS: { code: string; label: string }[] = [
  { code: '', label: 'Todos' },
  { code: 'Furto', label: '🔓 Furto' },
  { code: 'Suspeito', label: '👁️ Suspeito' },
  { code: 'Incendio', label: '🔥 Incêndio' },
  { code: 'Acidente', label: '🚗 Acidente' },
  { code: 'Outros', label: '⚠️ Outros' },
];

const KIND_COLORS: Record<SecurityAlertKind, string> = {
  Furto: 'bg-danger/10 text-danger',
  Suspeito: 'bg-accent/15 text-accent',
  Incendio: 'bg-accent/15 text-accent',
  Acidente: 'bg-primary/10 text-primary',
  Outros: 'bg-muted text-muted-fg',
};

function AlertIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl animate-shimmer" />
        <div className="h-4 w-28 rounded-full animate-shimmer" />
      </div>
      <div className="h-3 w-full rounded-full animate-shimmer" />
      <div className="h-3 w-3/4 rounded-full animate-shimmer" />
    </div>
  );
}

export default function AlertasPage() {
  const user = useAuthStore((s) => s.user);
  const [alerts, setAlerts] = useState<SecurityAlertSummary[]>([]);
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.bairroId) { setLoading(false); return; }
    setLoading(true);
    getSecurityAlerts(user.bairroId, { kind: kind || undefined })
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, [user?.bairroId, kind]);

  const handleUpvote = async (a: SecurityAlertSummary) => {
    if (!user) return;
    setUpvoting(a.id);
    try {
      const { upvoteCount } = await upvoteSecurityAlert(a.id);
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, upvoteCount } : x)));
    } catch {
      // silencioso
    } finally {
      setUpvoting(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-danger"><AlertIcon /></span>
            <h1 className="text-3xl font-extrabold text-fg leading-tight">Alertas de Segurança</h1>
          </div>
          <p className="text-muted-fg font-medium">
            Ocorrências reportadas por moradores verificados do seu bairro.
          </p>
        </div>
        {user?.isVerified && (
          <Link href="/alertas/new">
            <Button variant="primary" size="sm">
              <PlusIcon />
              Reportar
            </Button>
          </Link>
        )}
      </header>

      {/* Kind filter chips */}
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.code}
            onClick={() => setKind(f.code)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
              kind === f.code
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-muted text-muted-fg border-border/50 hover:border-primary/30 hover:text-primary',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="Nenhum alerta ativo"
          description={
            user?.isVerified
              ? 'Nenhuma ocorrência reportada no seu bairro. Se você viu algo, reporte.'
              : 'Nenhuma ocorrência reportada no seu bairro.'
          }
          action={
            user?.isVerified
              ? { label: 'Reportar ocorrência', onClick: () => window.location.assign('/alertas/new') }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {alerts.map((a, i) => (
            <div
              key={a.id}
              data-testid="alert-card"
              className={`bg-card rounded-2xl border border-border/50 shadow-sm p-4 animate-slide-up stagger-slide-${Math.min((i % 5) + 1, 5)}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Kind badge + icon */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0 text-xl">
                    {SECURITY_ALERT_KIND_EMOJI[a.kind]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${KIND_COLORS[a.kind]}`}>
                        {SECURITY_ALERT_KIND_LABELS[a.kind]}
                      </span>
                      <span className="text-xs text-muted-fg">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="font-semibold text-fg mt-0.5 line-clamp-2 text-sm">{a.description}</p>
                  </div>
                </div>
              </div>

              {a.locationDescription && (
                <p className="text-xs text-muted-fg mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {a.locationDescription}
                </p>
              )}

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-fg">
                  por <span className="font-medium text-fg">{a.reportedBy ?? 'Morador'}</span>
                </span>

                {/* Upvote "Eu também vi" */}
                <button
                  onClick={() => handleUpvote(a)}
                  disabled={!user || upvoting === a.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-fg hover:text-primary disabled:opacity-50 transition-colors"
                >
                  {upvoting === a.id ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
                      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                  )}
                  {a.upvoteCount > 0 && <span>{a.upvoteCount}</span>}
                  Eu também vi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note for unverified users */}
      {user && !user.isVerified && (
        <p className="text-xs text-muted-fg text-center">
          Apenas moradores verificados podem reportar alertas.{' '}
          <Link href="/cep-lookup/" className="text-primary hover:underline font-medium">
            Verificar endereço
          </Link>
        </p>
      )}
    </div>
  );
}
