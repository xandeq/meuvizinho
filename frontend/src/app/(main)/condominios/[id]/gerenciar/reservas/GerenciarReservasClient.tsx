'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import {
  getCommonAreas, getPendingReservations, getReservations,
  approveReservation, rejectReservation, cancelReservation,
} from '@/lib/api/reservations';
import type { CondominiumDetail } from '@/lib/types/community';
import type { CommonAreaSummary, AreaReservation, AreaReservationStatus } from '@/lib/types/reservations';
import { RESERVATION_STATUS_LABELS } from '@/lib/types/reservations';
import { formatRangePtBR } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const STATUS_BADGE: Record<AreaReservationStatus, string> = {
  Pending: 'bg-accent/15 text-accent',
  Approved: 'bg-secondary/15 text-secondary',
  Rejected: 'bg-danger/10 text-danger',
  Cancelled: 'bg-muted text-muted-fg',
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'Pending', label: 'Pendentes' },
  { value: 'Approved', label: 'Aprovadas' },
  { value: 'Rejected', label: 'Recusadas' },
  { value: 'Cancelled', label: 'Canceladas' },
];

export default function GerenciarReservasClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [loadingCondo, setLoadingCondo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [areas, setAreas] = useState<CommonAreaSummary[]>([]);

  const [pending, setPending] = useState<AreaReservation[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingBusyId, setPendingBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [agenda, setAgenda] = useState<AreaReservation[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [agendaBusyId, setAgendaBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!condoId) return;
    setLoadingCondo(true);
    getCondominium(condoId)
      .then(setCondo)
      .catch(() => setCondo(null))
      .finally(() => setLoadingCondo(false));
  }, [condoId]);

  const isManager = !!condo?.isMySindico || !!user?.isAdmin;

  const loadPending = () => {
    setLoadingPending(true);
    getPendingReservations(condoId)
      .then(setPending)
      .catch(() => setError('Não foi possível carregar a fila de aprovação.'))
      .finally(() => setLoadingPending(false));
  };

  const loadAgenda = () => {
    setLoadingAgenda(true);
    getReservations(condoId, {
      areaId: filterAreaId ? Number(filterAreaId) : undefined,
      status: filterStatus ? (filterStatus as AreaReservationStatus) : undefined,
      from: filterFrom ? new Date(`${filterFrom}T00:00`).toISOString() : undefined,
      to: filterTo ? new Date(`${filterTo}T23:59`).toISOString() : undefined,
    })
      .then(setAgenda)
      .catch(() => setError('Não foi possível carregar a agenda.'))
      .finally(() => setLoadingAgenda(false));
  };

  useEffect(() => {
    if (!condoId || !isManager) return;
    loadPending();
    loadAgenda();
    getCommonAreas(condoId).then(setAreas).catch(() => setAreas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoId, isManager]);

  const handleApprove = async (id: number) => {
    setPendingBusyId(id);
    setError(null);
    try {
      await approveReservation(condoId, id);
      loadPending();
      loadAgenda();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? 'Esse horário já foi aprovado para outra reserva.' : 'Não foi possível aprovar a reserva.');
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (rejectTarget == null) return;
    const id = rejectTarget;
    setRejectTarget(null);
    setPendingBusyId(id);
    setError(null);
    try {
      await rejectReservation(condoId, id, rejectNote.trim() || undefined);
      loadPending();
      loadAgenda();
    } catch {
      setError('Não foi possível recusar a reserva.');
    } finally {
      setPendingBusyId(null);
      setRejectNote('');
    }
  };

  const handleCancelAgenda = async (id: number) => {
    if (!confirm('Cancelar esta reserva?')) return;
    setAgendaBusyId(id);
    setError(null);
    try {
      await cancelReservation(condoId, id);
      setAgenda((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Cancelled', cancelledAt: new Date().toISOString() } : r)));
    } catch {
      setError('Não foi possível cancelar a reserva.');
    } finally {
      setAgendaBusyId(null);
    }
  };

  if (loadingCondo) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-full animate-shimmer" />
        <div className="h-32 w-full rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (!condo) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
        <p className="text-fg font-bold text-lg">Condomínio não encontrado</p>
        <Link href="/condominios"><Button variant="primary">Voltar</Button></Link>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card padding="md">
          <h1 className="text-2xl font-extrabold text-fg">Acesso negado</h1>
          <p className="mt-2 text-fg/70 font-medium">Apenas o síndico ou um administrador pode gerenciar reservas.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
      <Link href={`/condominios/${condoId}/areas-comuns`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Áreas comuns
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-fg leading-tight">Gerenciar reservas</h1>
        <p className="text-muted-fg font-medium text-sm">{condo.name}</p>
      </header>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {/* Fila de aprovação */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-fg">Aguardando aprovação</h2>
          <span className="text-sm font-semibold text-fg/70">{pending.length} pendente(s)</span>
        </div>

        {loadingPending ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <div key={i} className="h-16 bg-card border border-border/50 rounded-2xl animate-shimmer" />)}
          </div>
        ) : pending.length === 0 ? (
          <Card padding="md"><p className="text-fg/70 font-medium">Nenhuma reserva pendente.</p></Card>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
                <div className="min-w-0">
                  <p className="font-bold text-fg">{r.commonAreaName ?? 'Área comum'}</p>
                  <p className="text-sm text-muted-fg">{formatRangePtBR(r.startUtc, r.endUtc)}</p>
                  <p className="text-xs text-muted-fg">
                    {r.userName ?? 'Morador'}{r.title && ` · ${r.title}`}{r.guestsCount != null && ` · ${r.guestsCount} convidado(s)`}
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" size="sm" loading={pendingBusyId === r.id} onClick={() => handleApprove(r.id)}>Aprovar</Button>
                  <Button variant="outline" size="sm" loading={pendingBusyId === r.id} onClick={() => { setRejectTarget(r.id); setRejectNote(''); }}>Recusar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agenda */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-fg">Agenda</h2>

        <div className="flex flex-wrap gap-2 items-end bg-card border border-border/50 rounded-2xl p-3">
          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Área</label>
            <select
              value={filterAreaId}
              onChange={(e) => setFilterAreaId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary text-sm font-medium"
            >
              <option value="">Todas</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary text-sm font-medium"
            >
              {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">De</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary text-sm font-medium" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Até</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="px-3 py-2 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary text-sm font-medium" />
          </div>
          <Button variant="secondary" size="sm" onClick={loadAgenda}>Filtrar</Button>
        </div>

        {loadingAgenda ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-card border border-border/50 rounded-2xl animate-shimmer" />)}
          </div>
        ) : agenda.length === 0 ? (
          <Card padding="md"><p className="text-fg/70 font-medium">Nenhuma reserva encontrada para este filtro.</p></Card>
        ) : (
          <div className="space-y-3">
            {agenda.map((r) => (
              <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-fg">{r.commonAreaName ?? 'Área comum'}</p>
                    <p className="text-sm text-muted-fg">{formatRangePtBR(r.startUtc, r.endUtc)}</p>
                    <p className="text-xs text-muted-fg">{r.userName ?? 'Morador'}{r.title && ` · ${r.title}`}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status]}`}>
                    {RESERVATION_STATUS_LABELS[r.status]}
                  </span>
                </div>
                {(r.status === 'Pending' || r.status === 'Approved') && (
                  <div className="flex gap-2 pt-1">
                    {r.status === 'Pending' && (
                      <>
                        <Button variant="primary" size="xs" loading={agendaBusyId === r.id} onClick={() => handleApprove(r.id)}>Aprovar</Button>
                        <Button variant="outline" size="xs" loading={agendaBusyId === r.id} onClick={() => { setRejectTarget(r.id); setRejectNote(''); }}>Recusar</Button>
                      </>
                    )}
                    <Button variant="destructive" size="xs" loading={agendaBusyId === r.id} onClick={() => handleCancelAgenda(r.id)}>Cancelar</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reject modal */}
      {rejectTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-fg mb-2">Recusar reserva</h3>
            <p className="text-sm text-muted-fg mb-3">Motivo (opcional):</p>
            <textarea
              className="w-full rounded-xl border border-border/50 bg-muted text-fg text-sm p-2 mb-5 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Ex: horário conflita com manutenção"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectTarget(null); setRejectNote(''); }} className="px-4 py-2 text-sm rounded-xl text-muted-fg hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleRejectConfirm} className="px-4 py-2 text-sm rounded-xl bg-danger text-white hover:bg-danger/90 transition-colors">
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
