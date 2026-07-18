'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getMyResidentStatus } from '@/lib/api/reservations';
import { getAnnouncement } from '@/lib/api/announcements';
import type { CondominiumDetail } from '@/lib/types/community';
import type { MyResidentInfo } from '@/lib/types/reservations';
import type { AnnouncementDetail } from '@/lib/types/announcements';
import { formatDatePtBR } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';

function MegaphoneIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5c0 3.2 3.6 7.68 4.4 8.64a.77.77 0 0 0 1.2 0C13.4 14.68 17 10.2 17 7a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
      <path d="M12 15v7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function ComunicadoDetailClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  const [announcementId, setAnnouncementId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)\/comunicados\/(\d+)/);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCondoId(parseInt(match[1], 10));
      setAnnouncementId(parseInt(match[2], 10));
    }
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [residency, setResidency] = useState<MyResidentInfo | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);

  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    if (!condoId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingAccess(true);
    Promise.all([getCondominium(condoId), getMyResidentStatus(condoId)])
      .then(([c, r]) => {
        setCondo(c);
        setResidency(r);
      })
      .catch(() => {
        setCondo(null);
        setResidency(null);
      })
      .finally(() => setLoadingAccess(false));
  }, [condoId]);

  const isManager = !!condo?.isMySindico || !!user?.isAdmin;
  const isApprovedResident = residency?.status === 'Approved';
  const canView = isApprovedResident || isManager;

  useEffect(() => {
    if (!condoId || !announcementId || !canView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingItem(true);
    setItemError(null);
    getAnnouncement(condoId, announcementId)
      .then(setAnnouncement)
      .catch((e: unknown) => {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setItemError(status === 404 ? 'Comunicado não encontrado.' : 'Não foi possível carregar o comunicado.');
      })
      .finally(() => setLoadingItem(false));
  }, [condoId, announcementId, canView]);

  if (loadingAccess) {
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

  if (!canView) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-fg font-bold text-lg">Vínculo de morador necessário</p>
        <p className="text-sm text-muted-fg">Só moradores aprovados pelo síndico podem ver os comunicados deste condomínio.</p>
        <Link href={`/condominios/${condoId}/vincular`}><Button variant="primary">Solicitar vínculo de morador</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <Link href={`/condominios/${condoId}/comunicados`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Comunicados
      </Link>

      {loadingItem ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-56 rounded-full animate-shimmer" />
          <div className="h-40 w-full rounded-2xl animate-shimmer" />
        </div>
      ) : itemError ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-fg font-bold text-lg">{itemError}</p>
          <Link href={`/condominios/${condoId}/comunicados`}><Button variant="primary">Voltar</Button></Link>
        </div>
      ) : announcement ? (
        <div className={`bg-card rounded-2xl border shadow-sm p-5 space-y-4 ${announcement.isImportant ? 'border-danger/30' : 'border-border/50'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${announcement.isImportant ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
              <MegaphoneIcon />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {announcement.isPinned && <PinIcon className="text-primary shrink-0" />}
                <h1 className="text-2xl font-extrabold text-fg leading-tight">{announcement.title}</h1>
              </div>
              {announcement.isImportant && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-danger/10 text-danger">
                  Importante
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-fg">
            {announcement.authorName ?? 'Síndico'} · {formatDatePtBR(announcement.publishedAt)}
            {announcement.updatedAt && ' · editado'}
          </p>

          <div className="text-sm text-fg/90 leading-relaxed whitespace-pre-line">{announcement.body}</div>

          {announcement.expiresAt && (
            <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2 text-xs text-accent font-medium">
              Válido até {formatDatePtBR(announcement.expiresAt)}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
