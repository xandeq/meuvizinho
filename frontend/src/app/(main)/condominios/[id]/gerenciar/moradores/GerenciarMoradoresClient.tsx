'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getResidents, approveResident, rejectResident, revokeResident } from '@/lib/api/reservations';
import type { CondominiumDetail } from '@/lib/types/community';
import type { CondominiumResident, CondominiumResidentStatus } from '@/lib/types/reservations';
import { RESIDENT_STATUS_LABELS } from '@/lib/types/reservations';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Pending', label: 'Pendentes' },
  { value: 'Approved', label: 'Aprovados' },
  { value: 'Rejected', label: 'Recusados' },
  { value: 'Revoked', label: 'Revogados' },
];

const STATUS_BADGE: Record<CondominiumResidentStatus, string> = {
  Pending: 'bg-accent/15 text-accent',
  Approved: 'bg-secondary/15 text-secondary',
  Rejected: 'bg-danger/10 text-danger',
  Revoked: 'bg-muted text-muted-fg',
};

export default function GerenciarMoradoresClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [loadingCondo, setLoadingCondo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [residents, setResidents] = useState<CondominiumResident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionTarget, setActionTarget] = useState<{ id: number; kind: 'reject' | 'revoke' } | null>(null);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    if (!condoId) return;
    setLoadingCondo(true);
    getCondominium(condoId)
      .then(setCondo)
      .catch(() => setCondo(null))
      .finally(() => setLoadingCondo(false));
  }, [condoId]);

  const isManager = !!condo?.isMySindico || !!user?.isAdmin;

  const loadResidents = () => {
    setLoadingResidents(true);
    getResidents(condoId, statusFilter ? { status: statusFilter as CondominiumResidentStatus } : undefined)
      .then(setResidents)
      .catch(() => setError('Não foi possível carregar os moradores.'))
      .finally(() => setLoadingResidents(false));
  };

  useEffect(() => {
    if (!condoId || !isManager) return;
    loadResidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoId, isManager, statusFilter]);

  const handleApprove = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveResident(condoId, id);
      loadResidents();
    } catch {
      setError('Não foi possível aprovar o vínculo.');
    } finally {
      setBusyId(null);
    }
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionNote('');
  };

  const handleActionConfirm = async () => {
    if (!actionTarget) return;
    const { id, kind } = actionTarget;
    setBusyId(id);
    setError(null);
    closeAction();
    try {
      if (kind === 'reject') await rejectResident(condoId, id, actionNote.trim() || undefined);
      else await revokeResident(condoId, id, actionNote.trim() || undefined);
      loadResidents();
    } catch {
      setError(kind === 'reject' ? 'Não foi possível recusar a solicitação.' : 'Não foi possível revogar o vínculo.');
    } finally {
      setBusyId(null);
    }
  };

  if (loadingCondo) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
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
          <p className="mt-2 text-fg/70 font-medium">Apenas o síndico ou um administrador pode gerenciar moradores.</p>
        </Card>
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
        <h1 className="text-2xl font-extrabold text-fg leading-tight">Gerenciar moradores</h1>
        <p className="text-muted-fg font-medium text-sm">{condo.name}</p>
      </header>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
              statusFilter === f.value
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-muted text-muted-fg border-border/50 hover:border-primary/30 hover:text-primary',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadingResidents ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-card border border-border/50 rounded-2xl animate-shimmer" />)}
        </div>
      ) : residents.length === 0 ? (
        <Card padding="md"><p className="text-fg/70 font-medium">Nenhum morador encontrado para este filtro.</p></Card>
      ) : (
        <div className="space-y-3">
          {residents.map((r) => (
            <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-fg">{r.userName ?? 'Morador'}</p>
                  {r.unit && <p className="text-sm text-muted-fg">{r.unit}</p>}
                  {r.reviewNote && <p className="text-xs text-muted-fg italic mt-0.5">&ldquo;{r.reviewNote}&rdquo;</p>}
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status]}`}>
                  {RESIDENT_STATUS_LABELS[r.status]}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                {r.status === 'Pending' && (
                  <>
                    <Button variant="primary" size="sm" loading={busyId === r.id} onClick={() => handleApprove(r.id)}>Aprovar</Button>
                    <Button variant="outline" size="sm" loading={busyId === r.id} onClick={() => { setActionTarget({ id: r.id, kind: 'reject' }); setActionNote(''); }}>Recusar</Button>
                  </>
                )}
                {r.status === 'Approved' && (
                  <Button variant="destructive" size="sm" loading={busyId === r.id} onClick={() => { setActionTarget({ id: r.id, kind: 'revoke' }); setActionNote(''); }}>Revogar vínculo</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject/revoke modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-fg mb-2">
              {actionTarget.kind === 'reject' ? 'Recusar solicitação' : 'Revogar vínculo'}
            </h3>
            <p className="text-sm text-muted-fg mb-3">Motivo (opcional):</p>
            <textarea
              className="w-full rounded-xl border border-border/50 bg-muted text-fg text-sm p-2 mb-5 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={actionTarget.kind === 'reject' ? 'Ex: não consta na lista de moradores' : 'Ex: mudou-se do condomínio'}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={closeAction} className="px-4 py-2 text-sm rounded-xl text-muted-fg hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleActionConfirm} className="px-4 py-2 text-sm rounded-xl bg-danger text-white hover:bg-danger/90 transition-colors">
                {actionTarget.kind === 'reject' ? 'Recusar' : 'Revogar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
