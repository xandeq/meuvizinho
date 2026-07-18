'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getCommonArea, getCommonAreas, createCommonArea, updateCommonArea, deleteCommonArea } from '@/lib/api/reservations';
import type { CondominiumDetail } from '@/lib/types/community';
import type { CommonAreaSummary, CommonAreaInput } from '@/lib/types/reservations';
import { formatTimeHHmm } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface FormState {
  name: string;
  description: string;
  rules: string;
  capacity: string;
  coverImageUrl: string;
  requiresApproval: boolean;
  openTime: string;
  closeTime: string;
  minAdvanceHours: string;
  maxAdvanceDays: string;
  maxDurationMinutes: string;
}

const emptyForm: FormState = {
  name: '', description: '', rules: '', capacity: '', coverImageUrl: '',
  requiresApproval: true, openTime: '', closeTime: '',
  minAdvanceHours: '0', maxAdvanceDays: '90', maxDurationMinutes: '',
};

function toInput(f: FormState): CommonAreaInput | null {
  if (f.name.trim().length < 2) return null;
  return {
    name: f.name.trim(),
    description: f.description.trim() || undefined,
    rules: f.rules.trim() || undefined,
    capacity: f.capacity ? Number(f.capacity) : undefined,
    coverImageUrl: f.coverImageUrl.trim() || undefined,
    requiresApproval: f.requiresApproval,
    openTime: f.openTime || undefined,
    closeTime: f.closeTime || undefined,
    minAdvanceHours: f.minAdvanceHours ? Number(f.minAdvanceHours) : 0,
    maxAdvanceDays: f.maxAdvanceDays ? Number(f.maxAdvanceDays) : 90,
    maxDurationMinutes: f.maxDurationMinutes ? Number(f.maxDurationMinutes) : undefined,
  };
}

export default function GerenciarAreasComunsClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)/);
    if (match) setCondoId(parseInt(match[1], 10));
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [loadingCondo, setLoadingCondo] = useState(true);

  const [areas, setAreas] = useState<CommonAreaSummary[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

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

  const loadAreas = () => {
    setLoadingAreas(true);
    setListError(null);
    getCommonAreas(condoId)
      .then(setAreas)
      .catch(() => setListError('Não foi possível carregar as áreas comuns.'))
      .finally(() => setLoadingAreas(false));
  };

  useEffect(() => {
    if (!condoId || !isManager) return;
    loadAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoId, isManager]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = async (id: number) => {
    setBusyId(id);
    try {
      const detail = await getCommonArea(condoId, id);
      setEditingId(id);
      setForm({
        name: detail.name,
        description: detail.description ?? '',
        rules: detail.rules ?? '',
        capacity: detail.capacity != null ? String(detail.capacity) : '',
        coverImageUrl: detail.coverImageUrl ?? '',
        requiresApproval: detail.requiresApproval,
        openTime: formatTimeHHmm(detail.openTime),
        closeTime: formatTimeHHmm(detail.closeTime),
        minAdvanceHours: String(detail.minAdvanceHours),
        maxAdvanceDays: String(detail.maxAdvanceDays),
        maxDurationMinutes: detail.maxDurationMinutes != null ? String(detail.maxDurationMinutes) : '',
      });
      setFormError(null);
      setShowForm(true);
    } catch {
      setListError('Não foi possível carregar esta área para edição.');
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
    const input = toInput(form);
    if (!input) {
      setFormError('Informe o nome da área (mínimo 2 caracteres).');
      return;
    }
    if (input.openTime && input.closeTime && input.openTime >= input.closeTime) {
      setFormError('O horário de abertura deve ser antes do horário de fechamento.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId != null) await updateCommonArea(condoId, editingId, input);
      else await createCommonArea(condoId, input);
      closeForm();
      loadAreas();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Não foi possível salvar a área. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Desativar esta área? Reservas futuras pendentes ou aprovadas serão canceladas.')) return;
    setBusyId(id);
    try {
      await deleteCommonArea(condoId, id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setListError('Não foi possível desativar a área.');
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
          <p className="mt-2 text-fg/70 font-medium">Apenas o síndico ou um administrador pode gerenciar as áreas comuns.</p>
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

      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-fg leading-tight">Gerenciar áreas comuns</h1>
          <p className="text-muted-fg font-medium text-sm">{condo.name}</p>
        </div>
        {!showForm && <Button variant="primary" size="sm" onClick={openCreateForm}>Nova área</Button>}
      </header>

      {listError && <p className="text-sm text-danger font-semibold">{listError}</p>}

      {showForm && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          <p className="font-bold text-fg">{editingId != null ? 'Editar área' : 'Nova área comum'}</p>
          {formError && <p className="text-danger text-xs">{formError}</p>}

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.slice(0, 120) }))}
              placeholder="Ex: Salão de festas"
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Descrição (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 1000) }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Regras de uso (opcional)</label>
            <textarea
              value={form.rules}
              onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value.slice(0, 2000) }))}
              rows={3}
              placeholder="Ex: Proibido som após às 22h, devolver limpo..."
              className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Capacidade (opcional)</label>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Foto de capa (URL opcional)</label>
              <input
                value={form.coverImageUrl}
                onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Abre às (opcional)</label>
              <input
                type="time"
                value={form.openTime}
                onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Fecha às (opcional)</label>
              <input
                type="time"
                value={form.closeTime}
                onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Antecedência mín. (h)</label>
              <input
                type="number"
                min={0}
                value={form.minAdvanceHours}
                onChange={(e) => setForm((f) => ({ ...f, minAdvanceHours: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Antecedência máx. (dias)</label>
              <input
                type="number"
                min={1}
                value={form.maxAdvanceDays}
                onChange={(e) => setForm((f) => ({ ...f, maxAdvanceDays: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Duração máx. (min, opcional)</label>
              <input
                type="number"
                min={0}
                value={form.maxDurationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, maxDurationMinutes: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
              className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary"
            />
            Reserva precisa de aprovação do síndico
          </label>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={closeForm}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {editingId != null ? 'Salvar alterações' : 'Cadastrar área'}
            </Button>
          </div>
        </div>
      )}

      {loadingAreas ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 bg-card border border-border/50 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : areas.length === 0 ? (
        <p className="text-sm text-muted-fg text-center py-8">Nenhuma área comum cadastrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {areas.map((a) => (
            <div key={a.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-fg">{a.name}</p>
                  <p className="text-xs text-muted-fg">
                    {a.capacity != null ? `Até ${a.capacity} pessoas · ` : ''}
                    {a.requiresApproval ? 'Aprovação manual' : 'Aprovação automática'}
                    {(a.openTime || a.closeTime) && ` · ${formatTimeHHmm(a.openTime) || '00:00'}–${formatTimeHHmm(a.closeTime) || '23:59'}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="xs" loading={busyId === a.id} onClick={() => openEditForm(a.id)}>Editar</Button>
                <Button variant="destructive" size="xs" loading={busyId === a.id} onClick={() => handleDeactivate(a.id)}>Desativar</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
