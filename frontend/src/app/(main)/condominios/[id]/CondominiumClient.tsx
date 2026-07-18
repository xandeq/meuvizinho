'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium, claimCondominium, clickWhatsAppGroup } from '@/lib/api/community';
import type { CondominiumDetail, CondominiumRole } from '@/lib/types/community';
import { WHATSAPP_KIND_LABELS } from '@/lib/types/community';
import Button from '@/components/ui/Button';

const ROLE_OPTIONS: { value: CondominiumRole; label: string }[] = [
  { value: 'Sindico', label: 'Síndico(a)' },
  { value: 'SubSindico', label: 'Subsíndico(a)' },
  { value: 'Administradora', label: 'Administradora' },
  { value: 'Conselheiro', label: 'Conselheiro(a)' },
];

function BuildingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

export default function CondominiumClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaim, setShowClaim] = useState(false);
  const [role, setRole] = useState<CondominiumRole>('Sindico');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  useEffect(() => {
    if (!condoId) return;
    setLoading(true);
    getCondominium(condoId)
      .then(setCondo)
      .catch(() => setCondo(null))
      .finally(() => setLoading(false));
  }, [condoId]);

  const handleJoin = async (groupId: number) => {
    try {
      const { inviteUrl } = await clickWhatsAppGroup(groupId);
      window.open(inviteUrl, '_blank', 'noopener,noreferrer');
    } catch {
      /* grupo pode ter saído do ar */
    }
  };

  const handleClaim = async () => {
    if (justification.trim().length < 10) {
      setClaimError('Explique por que você administra este condomínio (mín. 10 caracteres).');
      return;
    }
    setSubmitting(true);
    setClaimError(null);
    try {
      await claimCondominium(condoId, { requestedRole: role, justification: justification.trim() });
      setShowClaim(false);
      const fresh = await getCondominium(condoId);
      setCondo(fresh);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setClaimError(msg ?? 'Não foi possível enviar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-full animate-shimmer" />
        <div className="h-4 w-full rounded-full animate-shimmer" />
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

  const canClaim = !condo.isMySindico && condo.myClaimStatus !== 'Pending' && condo.status !== 'Claimed';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <Link href="/condominios" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Condomínios
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BuildingIcon className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-fg leading-tight">{condo.name}</h1>
            {condo.addressLine && <p className="text-muted-fg text-sm">{condo.addressLine}</p>}
            {condo.sindicoName ? (
              <p className="text-sm text-secondary font-semibold mt-1">
                {condo.sindicoRole === 'Administradora' ? 'Administradora' : 'Síndico'}: {condo.sindicoName}
              </p>
            ) : (
              <p className="text-sm text-muted-fg font-medium mt-1">Ainda sem síndico no app</p>
            )}
          </div>
        </div>
        {condo.description && <p className="text-sm text-fg/80 leading-relaxed">{condo.description}</p>}

        {/* Diferencial: a plataforma gere o WhatsApp */}
        {condo.isManagedByPlatform && (
          <div className="flex items-start gap-2 rounded-xl bg-secondary/10 border border-secondary/20 px-3 py-2 text-xs text-secondary font-medium">
            <WhatsAppIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Grupos administrados oficialmente pelo Meu Vizinho — sem spam, link sempre válido.</span>
          </div>
        )}
      </div>

      {/* Claim status / action */}
      {condo.isMySindico ? (
        <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3 text-sm text-secondary font-semibold">
          Você é o síndico deste condomínio no Meu Vizinho.
        </div>
      ) : condo.myClaimStatus === 'Pending' ? (
        <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-accent font-semibold">
          Sua reivindicação está em análise pela nossa equipe.
        </div>
      ) : canClaim ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          {!showClaim ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-fg font-medium">É o síndico ou administrador? Assuma o perfil.</p>
              <Button variant="primary" size="sm" onClick={() => setShowClaim(true)}>Reivindicar</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-bold text-fg">Reivindicar como responsável</p>
              {claimError && <p className="text-danger text-xs">{claimError}</p>}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CondominiumRole)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              >
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Ex: Fui eleito síndico na assembleia de março. Posso comprovar."
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium resize-none"
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowClaim(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" fullWidth loading={submitting} onClick={handleClaim}>Enviar solicitação</Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Áreas comuns */}
      <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-fg">Áreas comuns</h2>
            <p className="text-sm text-muted-fg">Reserve o salão de festas, churrasqueira e outros espaços do prédio.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/condominios/${condoId}/areas-comuns`}><Button variant="primary" size="sm">Ver áreas comuns</Button></Link>
          {condo.isMySindico ? (
            <>
              <Link href={`/condominios/${condoId}/gerenciar/reservas`}><Button variant="secondary" size="sm">Gerenciar reservas</Button></Link>
              <Link href={`/condominios/${condoId}/gerenciar/moradores`}><Button variant="secondary" size="sm">Gerenciar moradores</Button></Link>
            </>
          ) : (
            <Link href={`/condominios/${condoId}/vincular`}><Button variant="outline" size="sm">Vincular minha unidade</Button></Link>
          )}
        </div>
      </section>

      {/* Comunicados */}
      <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-fg">Comunicados</h2>
            <p className="text-sm text-muted-fg">Avisos oficiais publicados pelo síndico deste condomínio.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/condominios/${condoId}/comunicados`}><Button variant="primary" size="sm">Ver comunicados</Button></Link>
          {condo.isMySindico && (
            <Link href={`/condominios/${condoId}/gerenciar/comunicados`}><Button variant="secondary" size="sm">Gerenciar comunicados</Button></Link>
          )}
        </div>
      </section>

      {/* WhatsApp groups */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-fg">Grupos de WhatsApp</h2>
          <Link href="/whatsapp/new" className="text-sm font-semibold text-primary hover:underline">Adicionar</Link>
        </div>
        {condo.groups.length === 0 ? (
          <p className="text-sm text-muted-fg">Nenhum grupo verificado ainda para este condomínio.</p>
        ) : (
          <div className="space-y-2">
            {condo.groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 bg-card rounded-xl border border-border/50 shadow-sm p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-fg text-sm line-clamp-1">{g.name}</p>
                    <p className="text-xs text-muted-fg">
                      {WHATSAPP_KIND_LABELS[g.kind]}
                      {g.memberCountApprox != null && ` · ~${g.memberCountApprox} membros`}
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="xs" onClick={() => handleJoin(g.id)}>Entrar</Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
