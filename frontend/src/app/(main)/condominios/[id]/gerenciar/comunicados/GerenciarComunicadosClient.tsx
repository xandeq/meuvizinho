'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import {
  getManagedAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement,
  deleteAnnouncement, pinAnnouncement, unpinAnnouncement,
} from '@/lib/api/announcements';
import type { CondominiumDetail } from '@/lib/types/community';
import type { ManagedAnnouncement, AnnouncementInput } from '@/lib/types/announcements';
import { formatDatePtBR, localDateKey } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const TITLE_MAX = 160;
const BODY_MAX = 20000;

interface FormState {
  title: string;
  body: string;
  isImportant: boolean;
  isPinned: boolean;
  expiresAt: string;
}

const emptyForm: FormState = { title: '', body: '', isImportant: false, isPinned: false, expiresAt: '' };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function PinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5c0 3.2 3.6 7.68 4.4 8.64a.77.77 0 0 0 1.2 0C13.4 14.68 17 10.2 17 7a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
      <path d="M12 15v7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function GerenciarComunicadosClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [loadingCondo, setLoadingCondo] = useState(true);

  const [items, setItems] = useState<ManagedAnnouncement[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!condoId) return;
    setLoadingCondo(true);
    getCondominium(condoId)
      .then(setCondo)
      .catch(() => setCondo(null))
      .finally(() => setLoadingCondo(false));
  }, [condoId]);

  const isManager = !!condo?.isMySindico || !!user?.isAdmin;

  const loadItems = () => {
    setLoadingItems(true);
    setListError(null);
    getManagedAnnouncements(condoId, { includeDeleted: includeDeleted || undefined })
      .then(setItems)
      .catch(() => setListError('Não foi possível carregar os comunicados.'))
      .finally(() => setLoadingItems(false));
  };

  useEffect(() => {
    if (!condoId || !isManager) return;
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoId, isManager, includeDeleted]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = async (id: number) => {
    setBusyId(id);
    try {
      const detail = await getAnnouncement(condoId, id);
      setEditingId(id);
      setForm({
        title: detail.title,
        body: detail.body,
        isImportant: detail.isImportant,
        isPinned: detail.isPinned,
        expiresAt: detail.expiresAt ? localDateKey(detail.expiresAt) : '',
      });
      setFormError(null);
      setShowForm(true);
    } catch {
      setListError('Não foi possível carregar este comunicado para edição.');
    } finally {
      setBusyId(null);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const body = form.body.trim();
    if (title.length < 1) {
      setFormError('Informe o título do comunicado.');
      return;
    }
    if (title.length > TITLE_MAX) {
      setFormError(`O título pode ter no máximo ${TITLE_MAX} caracteres.`);
      return;
    }
    if (body.length < 1) {
      setFormError('Escreva a mensagem do comunicado.');
      return;
    }
    if (body.length > BODY_MAX) {
      setFormError(`A mensagem pode ter no máximo ${BODY_MAX} caracteres.`);
      return;
    }

    let expiresAt: string | undefined;
    if (form.expiresAt) {
      const iso = new Date(`${form.expiresAt}T23:59:59`).toISOString();
      if (new Date(iso).getTime() <= Date.now()) {
        setFormError('A data de validade precisa ser no futuro.');
        return;
      }
      expiresAt = iso;
    }

    const input: AnnouncementInput = {
      title, body, isImportant: form.isImportant, isPinned: form.isPinned, expiresAt,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editingId != null) await updateAnnouncement(condoId, editingId, input);
      else await createAnnouncement(condoId, input);
      closeForm();
      loadItems();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Não foi possível salvar o comunicado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async (id: number) => {
    setBusyId(id);
    setListError(null);
    try {
      await pinAnnouncement(condoId, id);
      loadItems();
    } catch {
      setListError('Não foi possível fixar o comunicado.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpin = async (id: number) => {
    setBusyId(id);
    setListError(null);
    try {
      await unpinAnnouncement(condoId, id);
      loadItems();
    } catch {
      setListError('Não foi possível desafixar o comunicado.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este comunicado? Ele deixará de aparecer para os moradores.')) return;
    setBusyId(id);
    setListError(null);
    try {
      await deleteAnnouncement(condoId, id);
      loadItems();
    } catch {
      setListError('Não foi possível excluir o comunicado.');
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
          <p className="mt-2 text-fg/70 font-medium">Apenas o síndico ou um administrador pode gerenciar comunicados.</p>
        </Card>
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

      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-fg leading-tight">Gerenciar comunicados</h1>
          <p className="text-muted-fg font-medium text-sm">{condo.name}</p>
        </div>
        {!showForm && <Button variant="primary" size="sm" onClick={openCreateForm}>Novo comunicado</Button>}
      </header>

      {listError && <p className="text-sm text-danger font-semibold">{listError}</p>}

      {showForm && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          <p className="font-bold text-fg">{editingId != null ? 'Editar comunicado' : 'Novo comunicado'}</p>
          {formError && <p className="text-danger text-xs">{formError}</p>}

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, TITLE_MAX) }))}
              placeholder="Ex: Manutenção da caixa d'água"
              maxLength={TITLE_MAX}
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
            />
            <p className="text-[10px] text-muted-fg mt-1 text-right">{form.title.length}/{TITLE_MAX}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Mensagem</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value.slice(0, BODY_MAX) }))}
              rows={6}
              placeholder="Escreva o comunicado completo..."
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium resize-y"
            />
            <p className="text-[10px] text-muted-fg mt-1 text-right">{form.body.length}/{BODY_MAX}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Validade (opcional)</label>
            <input
              type="date"
              value={form.expiresAt}
              min={todayStr()}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
            />
            <p className="text-[10px] text-muted-fg mt-1">Depois dessa data o comunicado some da lista dos moradores, mas continua no histórico.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={form.isImportant}
                onChange={(e) => setForm((f) => ({ ...f, isImportant: e.target.checked }))}
                className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary"
              />
              Marcar como importante (destaque + notificação prioritária)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary"
              />
              Fixar no topo da lista
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={closeForm}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {editingId != null ? 'Salvar alterações' : 'Publicar comunicado'}
            </Button>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-medium text-muted-fg cursor-pointer">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) => setIncludeDeleted(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-border/50 text-primary focus:ring-primary"
        />
        Ver excluídos
      </label>

      {loadingItems ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-20 bg-card border border-border/50 rounded-2xl animate-shimmer" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-fg text-center py-8">Nenhum comunicado cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className={`bg-card rounded-2xl border shadow-sm p-4 space-y-2 ${a.deletedAt ? 'border-danger/30 opacity-60' : 'border-border/50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {a.isPinned && <PinIcon className="text-primary shrink-0" />}
                    <p className="font-bold text-fg line-clamp-1">{a.title}</p>
                  </div>
                  <p className="text-sm text-muted-fg line-clamp-2 mt-0.5">{a.bodyPreview}</p>
                  <p className="text-xs text-muted-fg mt-1">
                    {formatDatePtBR(a.publishedAt)}{a.authorName && ` · ${a.authorName}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {a.isImportant && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-danger/10 text-danger">Importante</span>
                  )}
                  {a.isExpired && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-muted text-muted-fg">Expirado</span>
                  )}
                  {a.deletedAt && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-danger/10 text-danger">Excluído</span>
                  )}
                </div>
              </div>
              {!a.deletedAt && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="xs" loading={busyId === a.id} onClick={() => openEditForm(a.id)}>Editar</Button>
                  {a.isPinned ? (
                    <Button variant="secondary" size="xs" loading={busyId === a.id} onClick={() => handleUnpin(a.id)}>Desafixar</Button>
                  ) : (
                    <Button variant="secondary" size="xs" loading={busyId === a.id} onClick={() => handlePin(a.id)}>Fixar</Button>
                  )}
                  <Button variant="destructive" size="xs" loading={busyId === a.id} onClick={() => handleDelete(a.id)}>Excluir</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
