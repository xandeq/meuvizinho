'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyReservations, cancelReservation } from '@/lib/api/reservations';
import type { AreaReservation, AreaReservationStatus } from '@/lib/types/reservations';
import { RESERVATION_STATUS_LABELS } from '@/lib/types/reservations';
import { formatRangePtBR } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_BADGE: Record<AreaReservationStatus, string> = {
  Pending: 'bg-accent/15 text-accent',
  Approved: 'bg-secondary/15 text-secondary',
  Rejected: 'bg-danger/10 text-danger',
  Cancelled: 'bg-muted text-muted-fg',
};

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
      <div className="h-4 w-40 rounded-full animate-shimmer" />
      <div className="h-3 w-full rounded-full animate-shimmer" />
    </div>
  );
}

export default function MinhasReservasClient() {
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [reservations, setReservations] = useState<AreaReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    if (!condoId) return;
    setLoading(true);
    setError(null);
    getMyReservations(condoId)
      .then(setReservations)
      .catch(() => setError('Não foi possível carregar suas reservas.'))
      .finally(() => setLoading(false));
  }, [condoId]);

  const handleCancel = async (id: number) => {
    if (!confirm('Cancelar esta reserva?')) return;
    setCancellingId(id);
    try {
      await cancelReservation(condoId, id);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Cancelled', cancelledAt: new Date().toISOString() } : r)));
    } catch {
      setError('Não foi possível cancelar a reserva. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

  const now = Date.now();
  const future = reservations
    .filter((r) => new Date(r.startUtc).getTime() >= now)
    .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
  const past = reservations
    .filter((r) => new Date(r.startUtc).getTime() < now)
    .sort((a, b) => new Date(b.startUtc).getTime() - new Date(a.startUtc).getTime());

  function ReservationCard({ r }: { r: AreaReservation }) {
    const canCancel = new Date(r.startUtc).getTime() >= now && (r.status === 'Pending' || r.status === 'Approved');
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-fg line-clamp-1">{r.commonAreaName ?? 'Área comum'}</p>
            <p className="text-sm text-muted-fg">{formatRangePtBR(r.startUtc, r.endUtc)}</p>
            {r.title && <p className="text-sm text-fg/80 mt-0.5">{r.title}</p>}
            {r.guestsCount != null && <p className="text-xs text-muted-fg">{r.guestsCount} convidado(s)</p>}
          </div>
          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status]}`}>
            {RESERVATION_STATUS_LABELS[r.status]}
          </span>
        </div>
        {r.reviewNote && (
          <p className="text-xs text-muted-fg italic">&ldquo;{r.reviewNote}&rdquo;</p>
        )}
        {canCancel && (
          <div className="pt-1">
            <Button variant="outline" size="xs" loading={cancellingId === r.id} onClick={() => handleCancel(r.id)}>
              Cancelar reserva
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <Link href={`/condominios/${condoId}/areas-comuns`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Áreas comuns
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-fg leading-tight">Minhas reservas</h1>
        <p className="text-muted-fg font-medium text-sm">Suas reservas de áreas comuns neste condomínio.</p>
      </header>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard />
        </div>
      ) : reservations.length === 0 ? (
        <EmptyState
          title="Nenhuma reserva ainda"
          description="Reserve o salão de festas, churrasqueira ou outro espaço do prédio."
          action={{ label: 'Ver áreas comuns', onClick: () => window.location.assign(`/condominios/${condoId}/areas-comuns/`) }}
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-fg uppercase tracking-wide text-muted-fg">Próximas</h2>
            {future.length === 0 ? (
              <p className="text-sm text-muted-fg">Nenhuma reserva futura.</p>
            ) : (
              <div className="space-y-3">
                {future.map((r) => <ReservationCard key={r.id} r={r} />)}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-fg uppercase tracking-wide text-muted-fg">Passadas</h2>
              <div className="space-y-3">
                {past.map((r) => <ReservationCard key={r.id} r={r} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
