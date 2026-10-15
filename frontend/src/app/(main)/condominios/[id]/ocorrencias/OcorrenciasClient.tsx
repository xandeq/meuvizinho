'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getMyResidentStatus } from '@/lib/api/reservations';
import { createIncident, getAllIncidents, getMyIncidents, updateIncidentStatus } from '@/lib/api/incidents';
import type { CondominiumDetail } from '@/lib/types/community';
import type { MyResidentInfo } from '@/lib/types/reservations';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  type IncidentCategory,
  type IncidentDto,
  type IncidentStatus,
} from '@/lib/types/incidents';
import { formatDateTimePtBR } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';

const CATEGORIES = Object.keys(INCIDENT_CATEGORY_LABELS) as IncidentCategory[];

// Mesmo vocabulário de cor do app: aberta = âmbar, andamento = azul,
// resolvida = verde de confirmação, recusada = vermelho.
const STATUS_CLS: Record<IncidentStatus, string> = {
  Aberta: 'bg-accent-light text-accent',
  EmAndamento: 'bg-primary-light text-primary',
  Resolvida: 'bg-secondary-light text-secondary',
  Recusada: 'bg-danger-light text-danger',
};
const STATUS_DOT: Record<IncidentStatus, string> = {
  Aberta: 'bg-accent',
  EmAndamento: 'bg-primary',
  Resolvida: 'bg-secondary',
  Recusada: 'bg-danger',
};

function ToolIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z" />
    </svg>
  );
}

function Timeline({ status }: { status: IncidentStatus }) {
  const last: IncidentStatus = status === 'Recusada' ? 'Recusada' : 'Resolvida';
  const order: IncidentStatus[] = ['Aberta', 'EmAndamento', last];
  const reached = status === 'Recusada' ? 2 : order.indexOf(status);
  return (
    <ol className="flex items-center gap-2" aria-label="Andamento da ocorrência">
      {order.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s} className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${done ? STATUS_DOT[s] : 'bg-border'}`} />
            <span className={`text-xs font-semibold truncate ${done ? 'text-fg' : 'text-muted-fg'}`}>{INCIDENT_STATUS_LABELS[s]}</span>
            {i < order.length - 1 && <span className={`w-6 h-0.5 rounded ${i < reached ? STATUS_DOT[order[i + 1]] : 'bg-border'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function IncidentCard({
  item, isManager, showReporter, onUpdated, condoId,
}: { item: IncidentDto; isManager: boolean; showReporter: boolean; onUpdated: (i: IncidentDto) => void; condoId: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<IncidentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closed = item.status === 'Resolvida' || item.status === 'Recusada';

  const change = async (status: IncidentStatus) => {
    if (status === 'Recusada' && !note.trim()) {
      setError('Explique ao morador por que não será atendida.');
      return;
    }
    setError(null);
    setSaving(status);
    try {
      onUpdated(await updateIncidentStatus(condoId, item.id, { status, responseNote: note.trim() || undefined }));
      setNote('');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível atualizar.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <article className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start justify-between gap-3"
        aria-expanded={open}
      >
        <div className="min-w-0 space-y-1">
          <p className="font-bold text-fg leading-snug">{item.title}</p>
          <p className="text-xs text-muted-fg">
            {INCIDENT_CATEGORY_LABELS[item.category]} · {formatDateTimePtBR(item.createdAt)}
            {showReporter && item.reporterName ? ` · ${item.reporterName}` : ''}
          </p>
        </div>
        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${STATUS_CLS[item.status]}`}>
          {INCIDENT_STATUS_LABELS[item.status]}
        </span>
      </button>

      {open && (
        <div className="space-y-4 pt-1">
          <p className="text-sm text-fg/85 leading-relaxed whitespace-pre-line">{item.description}</p>
          {item.location && <p className="text-xs text-muted-fg">Local: {item.location}</p>}
          <Timeline status={item.status} />
          {item.responseNote && (
            <div className="rounded-xl bg-primary-light p-3">
              <p className="text-xs font-bold text-primary">Resposta {item.respondedByName ? `de ${item.respondedByName}` : 'do síndico'}</p>
              <p className="text-sm text-fg mt-1 whitespace-pre-line">{item.responseNote}</p>
            </div>
          )}
          {isManager && (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                rows={2}
                placeholder="Resposta ao morador (ex.: eletricista vem amanhã de manhã)"
                aria-label="Resposta ao morador"
                className="w-full px-3 py-2 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary text-sm resize-none"
              />
              {error && <p className="text-xs text-danger font-medium">{error}</p>}
              <div className="flex flex-wrap gap-2">
                {item.status !== 'EmAndamento' && (
                  <Button variant="outline" size="xs" loading={saving === 'EmAndamento'} onClick={() => change('EmAndamento')}>
                    {closed ? 'Reabrir' : 'Em andamento'}
                  </Button>
                )}
                {item.status !== 'Resolvida' && (
                  <Button variant="primary" size="xs" loading={saving === 'Resolvida'} onClick={() => change('Resolvida')}>
                    Marcar como resolvida
                  </Button>
                )}
                {!closed && (
                  <Button variant="destructive" size="xs" loading={saving === 'Recusada'} onClick={() => change('Recusada')}>
                    Recusar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function OcorrenciasClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [residency, setResidency] = useState<MyResidentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // null = automático: síndico abre em 'Todas' (antes caía em 'Minhas', vazia).
  const [scopeChoice, setScope] = useState<'mine' | 'all' | null>(null);
  const [items, setItems] = useState<IncidentDto[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!condoId) return;
    Promise.all([getCondominium(condoId), getMyResidentStatus(condoId)])
      .then(([c, r]) => { setCondo(c); setResidency(r); })
      .catch(() => { setCondo(null); setResidency(null); })
      .finally(() => setLoading(false));
  }, [condoId]);

  const isManager = !!condo?.isMySindico || !!user?.isAdmin;
  const scope: 'mine' | 'all' = scopeChoice ?? (isManager ? 'all' : 'mine');
  const canUse = residency?.status === 'Approved' || isManager;

  const loadList = useCallback(() => {
    if (!condoId || !canUse) return;
    setListError(null);
    (scope === 'all' && isManager ? getAllIncidents(condoId) : getMyIncidents(condoId))
      .then(setItems)
      .catch(() => setListError('Não foi possível carregar as ocorrências.'));
  }, [condoId, canUse, scope, isManager]);

  useEffect(() => { loadList(); }, [loadList]);

  const counts = useMemo(() => ({
    open: items.filter((i) => i.status === 'Aberta').length,
    doing: items.filter((i) => i.status === 'EmAndamento').length,
    closed: items.filter((i) => i.status === 'Resolvida' || i.status === 'Recusada').length,
  }), [items]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return setFormError('Escolha o assunto.');
    if (title.trim().length < 4) return setFormError('Dê um título curto, como "Lâmpada queimada no hall".');
    if (description.trim().length < 10) return setFormError('Conte um pouco mais: o que aconteceu e desde quando.');
    setFormError(null);
    setSending(true);
    try {
      const created = await createIncident(condoId, {
        category, title: title.trim(), description: description.trim(), location: location.trim() || undefined,
      });
      setItems((prev) => (scope === 'mine' || isManager ? [created, ...prev] : prev));
      setFormOpen(false);
      setCategory(null); setTitle(''); setDescription(''); setLocation('');
    } catch (e2: unknown) {
      setFormError((e2 as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-full animate-shimmer" />
        <div className="h-24 w-full rounded-2xl animate-shimmer" />
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
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <Link href={`/condominios/${condoId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        {condo.name}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-primary"><ToolIcon /></span>
            <h1 className="text-2xl font-extrabold text-fg leading-tight">Ocorrências</h1>
          </div>
          <p className="text-muted-fg font-medium text-sm">Avise o síndico sobre um problema e acompanhe até resolver.</p>
        </div>
        {canUse && !formOpen && (
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>Nova ocorrência</Button>
        )}
      </header>

      {!canUse ? (
        <div className="bg-card rounded-2xl border border-border/50 p-6 text-center space-y-4">
          <p className="font-bold text-fg">Só moradores vinculados podem abrir ocorrências</p>
          <p className="text-sm text-muted-fg">Peça o vínculo da sua unidade ao síndico para usar esta área.</p>
          <Link href={`/condominios/${condoId}/vincular`}><Button variant="primary" size="sm">Solicitar vínculo de morador</Button></Link>
        </div>
      ) : (
        <>
          {formOpen && (
            <form onSubmit={submit} className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
              <p className="font-bold text-fg">Nova ocorrência</p>
              <fieldset>
                <legend className="text-xs font-medium text-muted-fg mb-2">Assunto</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={`h-11 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        category === c ? 'border-primary bg-primary-light text-primary' : 'border-border text-fg hover:border-border-strong'
                      }`}
                    >
                      {INCIDENT_CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Título (ex.: Lâmpada queimada no hall)"
                aria-label="Título"
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                rows={4}
                placeholder="O que aconteceu e desde quando"
                aria-label="Descrição"
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary resize-none"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, 120))}
                placeholder="Onde (opcional, ex.: garagem, vaga 12)"
                aria-label="Local"
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
              {formError && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{formError}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" size="sm" fullWidth loading={sending}>Enviar ao síndico</Button>
              </div>
            </form>
          )}

          {isManager && (
            <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
              {(['mine', 'all'] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={scope === s}
                  onClick={() => setScope(s)}
                  className={`px-4 h-9 rounded-lg text-sm font-semibold transition-colors ${scope === s ? 'bg-card text-fg' : 'text-muted-fg hover:text-fg'}`}
                >
                  {s === 'mine' ? 'Minhas' : 'Todas do condomínio'}
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: counts.open, label: 'abertas', cls: 'text-accent' },
                { n: counts.doing, label: 'em andamento', cls: 'text-primary' },
                { n: counts.closed, label: 'encerradas', cls: 'text-muted-fg' },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl border border-border/50 py-3 text-center">
                  <p className={`text-2xl font-extrabold ${s.cls}`}>{s.n}</p>
                  <p className="text-xs text-muted-fg font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {listError ? (
            <p className="text-sm text-danger">{listError}</p>
          ) : items.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/50 p-8 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-light text-primary flex items-center justify-center"><ToolIcon className="w-6 h-6" /></div>
              <p className="font-bold text-fg">Nenhuma ocorrência por aqui</p>
              <p className="text-sm text-muted-fg max-w-sm mx-auto">Lâmpada queimada, vazamento, barulho: avise o síndico e acompanhe a resposta sem depender do grupo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((i) => (
                <IncidentCard
                  key={i.id}
                  item={i}
                  condoId={condoId}
                  isManager={isManager}
                  showReporter={scope === 'all'}
                  onUpdated={(u) => setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
