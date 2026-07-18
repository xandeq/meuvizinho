'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getMyResidentStatus } from '@/lib/api/reservations';
import { getAnnouncements } from '@/lib/api/announcements';
import type { CondominiumDetail } from '@/lib/types/community';
import type { MyResidentInfo } from '@/lib/types/reservations';
import type { AnnouncementSummary } from '@/lib/types/announcements';
import { formatDatePtBR } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const PAGE_SIZE = 20;

function MegaphoneIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function PinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5c0 3.2 3.6 7.68 4.4 8.64a.77.77 0 0 0 1.2 0C13.4 14.68 17 10.2 17 7a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
      <path d="M12 15v7" stroke="currentColor" strokeWidth="1.5" />
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

// Reordena defensivamente no cliente (fixados primeiro, depois mais recentes) —
// espelha o índice/ORDER BY do backend, garantindo a UX mesmo se algum filtro
// intermediário embaralhar a ordem.
function sortAnnouncements(items: AnnouncementSummary[]): AnnouncementSummary[] {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export default function ComunicadosClient() {
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

  const [items, setItems] = useState<AnnouncementSummary[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
  const canView = isApprovedResident || isManager;

  useEffect(() => {
    if (!condoId || !canView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingItems(true);
    setItemsError(null);
    setPage(1);
    getAnnouncements(condoId, { page: 1 })
      .then((data) => {
        setItems(data);
        setHasMore(data.length >= PAGE_SIZE);
      })
      .catch(() => setItemsError('Não foi possível carregar os comunicados.'))
      .finally(() => setLoadingItems(false));
  }, [condoId, canView]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    getAnnouncements(condoId, { page: next })
      .then((data) => {
        setItems((prev) => [...prev, ...data]);
        setHasMore(data.length >= PAGE_SIZE);
        setPage(next);
      })
      .catch(() => setItemsError('Não foi possível carregar mais comunicados.'))
      .finally(() => setLoadingMore(false));
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-pulse">
        <div className="h-8 w-56 rounded-full animate-shimmer" />
        <SkeletonCard /><SkeletonCard />
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

  const sortedItems = sortAnnouncements(items);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <Link href={`/condominios/${condoId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {condo.name}
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-primary"><MegaphoneIcon /></span>
            <h1 className="text-2xl font-extrabold text-fg leading-tight">Comunicados</h1>
          </div>
          <p className="text-muted-fg font-medium text-sm">Avisos oficiais publicados pelo síndico deste condomínio.</p>
        </div>
      </header>

      {isManager && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/condominios/${condoId}/gerenciar/comunicados`}><Button variant="secondary" size="xs">Gerenciar comunicados</Button></Link>
        </div>
      )}

      {!canView ? (
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
              Só moradores aprovados pelo síndico podem ver os comunicados deste condomínio.
            </p>
          </div>
          <Link href={`/condominios/${condoId}/vincular`}>
            <Button variant="primary" size="sm">
              {residency?.status === 'Pending' ? 'Ver status do vínculo' : 'Solicitar vínculo de morador'}
            </Button>
          </Link>
        </div>
      ) : loadingItems ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : itemsError ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-sm text-danger font-medium">{itemsError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadingItems(true);
              setItemsError(null);
              getAnnouncements(condoId, { page: 1 })
                .then((data) => {
                  setItems(data);
                  setHasMore(data.length >= PAGE_SIZE);
                  setPage(1);
                })
                .catch(() => setItemsError('Não foi possível carregar os comunicados.'))
                .finally(() => setLoadingItems(false));
            }}
            className="text-xs text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState
          title="Nenhum comunicado ainda"
          description={isManager ? 'Publique avisos oficiais para os moradores deste condomínio.' : 'O síndico ainda não publicou nenhum comunicado.'}
          action={isManager ? { label: 'Publicar comunicado', onClick: () => window.location.assign(`/condominios/${condoId}/gerenciar/comunicados/`) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {sortedItems.map((a) => (
            <Link
              key={a.id}
              href={`/condominios/${condoId}/comunicados/${a.id}`}
              className={[
                'group block bg-card rounded-2xl border shadow-sm p-4 space-y-2 card-interactive',
                a.isImportant ? 'border-l-4 border-l-danger border-border/50' : 'border-border/50',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {a.isPinned && <PinIcon className="text-primary shrink-0" />}
                    <p className="font-bold text-fg leading-tight group-hover:text-primary transition-colors line-clamp-1">{a.title}</p>
                  </div>
                  <p className="text-sm text-muted-fg line-clamp-2 mt-1">{a.bodyPreview}</p>
                </div>
                {a.isImportant && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-danger/10 text-danger">
                    Importante
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs font-medium text-muted-fg">
                <span>{a.authorName ?? 'Síndico'}</span>
                <span>{formatDatePtBR(a.publishedAt)}</span>
              </div>
            </Link>
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button variant="outline" size="sm" loading={loadingMore} onClick={loadMore}>Carregar mais</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
