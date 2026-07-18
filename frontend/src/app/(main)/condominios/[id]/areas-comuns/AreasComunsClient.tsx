'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getMyResidentStatus, getCommonAreas } from '@/lib/api/reservations';
import type { CondominiumDetail } from '@/lib/types/community';
import type { MyResidentInfo, CommonAreaSummary } from '@/lib/types/reservations';
import { formatTimeHHmm } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

function DoorIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V4a1 1 0 0 1 1-1h9.5L18 5.5V21" />
      <path d="M6 21h12" />
      <path d="M14 12v.01" />
    </svg>
  );
}

function LockIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
      <div className="h-4 w-40 rounded-full animate-shimmer" />
      <div className="h-3 w-full rounded-full animate-shimmer" />
      <div className="h-3 w-24 rounded-full animate-shimmer" />
    </div>
  );
}

export default function AreasComunsClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [residency, setResidency] = useState<MyResidentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [areas, setAreas] = useState<CommonAreaSummary[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);

  useEffect(() => {
    if (!condoId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([getCondominium(condoId), getMyResidentStatus(condoId)])
      .then(([c, r]) => {
        setCondo(c);
        setResidency(r);
      })
      .catch(() => {
        setCondo(null);
        setResidency(null);
      })
      .finally(() => setLoading(false));
  }, [condoId]);

  const isManager = !!condo?.isMySindico || !!user?.isAdmin;
  const isApprovedResident = residency?.status === 'Approved';
  const canViewAreas = isApprovedResident || isManager;

  useEffect(() => {
    if (!condoId || !canViewAreas) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingAreas(true);
    setAreasError(null);
    getCommonAreas(condoId)
      .then(setAreas)
      .catch(() => setAreasError('Não foi possível carregar as áreas comuns.'))
      .finally(() => setLoadingAreas(false));
  }, [condoId, canViewAreas]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
        <div className="h-8 w-56 rounded-full animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard />
        </div>
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <Link href={`/condominios/${condoId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {condo.name}
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-primary"><DoorIcon /></span>
            <h1 className="text-2xl font-extrabold text-fg leading-tight">Áreas comuns</h1>
          </div>
          <p className="text-muted-fg font-medium text-sm">Salão de festas, churrasqueira, quadra e outros espaços do prédio.</p>
        </div>
        {isApprovedResident && (
          <Link href={`/condominios/${condoId}/minhas-reservas`} className="shrink-0">
            <Button variant="outline" size="sm">Minhas reservas</Button>
          </Link>
        )}
      </header>

      {isManager && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/condominios/${condoId}/gerenciar/areas-comuns`}><Button variant="secondary" size="xs">Gerenciar áreas</Button></Link>
          <Link href={`/condominios/${condoId}/gerenciar/reservas`}><Button variant="secondary" size="xs">Gerenciar reservas</Button></Link>
          <Link href={`/condominios/${condoId}/gerenciar/moradores`}><Button variant="secondary" size="xs">Gerenciar moradores</Button></Link>
        </div>
      )}

      {!canViewAreas ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <LockIcon />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-fg">
              {residency?.status === 'Pending'
                ? 'Sua solicitação de vínculo está em análise'
                : residency?.status === 'Rejected'
                  ? 'Sua solicitação de vínculo foi recusada'
                  : residency?.status === 'Revoked'
                    ? 'Seu vínculo com este condomínio foi revogado'
                    : 'Você ainda não é morador confirmado aqui'}
            </p>
            <p className="text-sm text-muted-fg">
              Só moradores aprovados pelo síndico podem reservar as áreas comuns deste condomínio.
            </p>
          </div>
          <Link href={`/condominios/${condoId}/vincular`}>
            <Button variant="primary" size="sm">
              {residency?.status === 'Pending' ? 'Ver status do vínculo' : 'Solicitar vínculo de morador'}
            </Button>
          </Link>
        </div>
      ) : loadingAreas ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : areasError ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-sm text-danger font-medium">{areasError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadingAreas(true);
              setAreasError(null);
              getCommonAreas(condoId)
                .then(setAreas)
                .catch(() => setAreasError('Não foi possível carregar as áreas comuns.'))
                .finally(() => setLoadingAreas(false));
            }}
            className="text-xs text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          title="Nenhuma área comum cadastrada ainda"
          description={isManager ? 'Cadastre o salão de festas, churrasqueira ou outros espaços do prédio.' : 'O síndico ainda não cadastrou espaços para reserva.'}
          action={isManager ? { label: 'Cadastrar área', onClick: () => window.location.assign(`/condominios/${condoId}/gerenciar/areas-comuns/`) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {areas.map((a, i) => (
            <Link
              key={a.id}
              href={`/condominios/${condoId}/areas-comuns/${a.id}`}
              className={`group block bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden animate-slide-up card-interactive stagger-slide-${Math.min((i % 5) + 1, 5)}`}
            >
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <DoorIcon className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-fg leading-tight group-hover:text-primary transition-colors line-clamp-1">{a.name}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.requiresApproval ? 'bg-accent/15 text-accent' : 'bg-secondary/15 text-secondary'}`}>
                    {a.requiresApproval ? 'Aprovação do síndico' : 'Reserva automática'}
                  </span>
                </div>
                {a.description && <p className="text-sm text-muted-fg line-clamp-2">{a.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs font-medium text-muted-fg">
                  <span>{a.capacity != null ? `Até ${a.capacity} pessoas` : 'Sem limite de pessoas'}</span>
                  {(a.openTime || a.closeTime) && (
                    <span>{formatTimeHHmm(a.openTime) || '00:00'}–{formatTimeHHmm(a.closeTime) || '23:59'}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
