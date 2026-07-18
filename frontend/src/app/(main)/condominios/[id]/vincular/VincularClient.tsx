'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCondominium } from '@/lib/api/community';
import { getMyResidentStatus, requestResidency } from '@/lib/api/reservations';
import type { CondominiumDetail } from '@/lib/types/community';
import type { MyResidentInfo } from '@/lib/types/reservations';
import { RESIDENT_STATUS_LABELS } from '@/lib/types/reservations';
import Button from '@/components/ui/Button';

export default function VincularClient() {
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [residency, setResidency] = useState<MyResidentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [unit, setUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    if (!condoId) return;
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoId]);

  const handleSubmit = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await requestResidency(condoId, { unit: unit.trim() || undefined });
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Não foi possível enviar a solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-pulse">
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

  const status = residency?.status ?? 'None';
  const canRequest = status === 'None' || status === 'Rejected' || status === 'Revoked';

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      <Link href={`/condominios/${condoId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {condo.name}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-fg leading-tight">Vínculo de morador</h1>
        <p className="text-muted-fg font-medium text-sm">
          Informe sua unidade para pedir acesso à reserva de áreas comuns de {condo.name}. Um síndico ou administrador precisa aprovar.
        </p>
      </header>

      {status === 'Approved' && (
        <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3 space-y-2">
          <p className="text-sm font-bold text-secondary">{RESIDENT_STATUS_LABELS.Approved}</p>
          {residency?.unit && <p className="text-sm text-secondary/80">Unidade: {residency.unit}</p>}
          <Link href={`/condominios/${condoId}/areas-comuns`} className="text-sm font-semibold text-secondary hover:underline">
            Ver áreas comuns
          </Link>
        </div>
      )}

      {status === 'Pending' && (
        <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3 space-y-1">
          <p className="text-sm font-bold text-accent">{RESIDENT_STATUS_LABELS.Pending}</p>
          {residency?.unit && <p className="text-sm text-accent/80">Unidade informada: {residency.unit}</p>}
          <p className="text-xs text-accent/80">Você será avisado assim que o síndico analisar sua solicitação.</p>
        </div>
      )}

      {status === 'Rejected' && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 space-y-1">
          <p className="text-sm font-bold text-danger">{RESIDENT_STATUS_LABELS.Rejected}</p>
          {residency?.reviewNote && <p className="text-xs text-danger/80 italic">&ldquo;{residency.reviewNote}&rdquo;</p>}
          <p className="text-xs text-muted-fg">Você pode enviar uma nova solicitação abaixo.</p>
        </div>
      )}

      {status === 'Revoked' && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 space-y-1">
          <p className="text-sm font-bold text-danger">{RESIDENT_STATUS_LABELS.Revoked}</p>
          <p className="text-xs text-muted-fg">Você pode enviar uma nova solicitação abaixo.</p>
        </div>
      )}

      {canRequest && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          <p className="font-bold text-fg">Solicitar vínculo</p>
          {formError && <p className="text-danger text-xs">{formError}</p>}
          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Unidade (opcional)</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value.slice(0, 60))}
              placeholder="Ex: Bloco B, Apto 302"
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
            />
          </div>
          <Button variant="primary" size="sm" fullWidth loading={submitting} onClick={handleSubmit}>
            Enviar solicitação
          </Button>
        </div>
      )}
    </div>
  );
}
