'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominium } from '@/lib/api/community';
import { getMyResidentStatus, getCommonArea, getAreaAvailability, createReservation } from '@/lib/api/reservations';
import type { CondominiumDetail } from '@/lib/types/community';
import type { MyResidentInfo, CommonAreaDetail, AvailabilityBlock, AreaReservation } from '@/lib/types/reservations';
import { formatTimeHHmm, formatRangePtBR, formatTimePtBR, rangesOverlap, localDateKey } from '@/lib/reservations-format';
import Button from '@/components/ui/Button';

function DoorIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V4a1 1 0 0 1 1-1h9.5L18 5.5V21" />
      <path d="M6 21h12" />
      <path d="M14 12v.01" />
    </svg>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysStr(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AreaDetailClient() {
  const user = useAuthStore((s) => s.user);
  const [condoId, setCondoId] = useState<number>(0);
  const [areaId, setAreaId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/condominios\/(\d+)\/areas-comuns\/(\d+)/);
    if (match) {
      setCondoId(parseInt(match[1], 10));
      setAreaId(parseInt(match[2], 10));
    }
  }, []);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [residency, setResidency] = useState<MyResidentInfo | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);

  const [area, setArea] = useState<CommonAreaDetail | null>(null);
  const [loadingArea, setLoadingArea] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [guestsCount, setGuestsCount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<AreaReservation | null>(null);

  useEffect(() => {
    if (!condoId) return;
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
  const canViewAreas = isApprovedResident || isManager;

  const loadAvailability = useCallback(() => {
    if (!condoId || !areaId) return;
    setLoadingAvailability(true);
    const from = new Date();
    const to = new Date(from.getTime() + 60 * 86_400_000);
    getAreaAvailability(condoId, areaId, { from: from.toISOString(), to: to.toISOString() })
      .then(setAvailability)
      .catch(() => setAvailability([]))
      .finally(() => setLoadingAvailability(false));
  }, [condoId, areaId]);

  useEffect(() => {
    if (!condoId || !areaId || !canViewAreas) return;
    setLoadingArea(true);
    setAreaError(null);
    getCommonArea(condoId, areaId)
      .then(setArea)
      .catch((e: unknown) => {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setAreaError(status === 404 ? 'Área comum não encontrada.' : 'Não foi possível carregar os detalhes da área.');
      })
      .finally(() => setLoadingArea(false));
    loadAvailability();
  }, [condoId, areaId, canViewAreas, loadAvailability]);

  const busyOnSelectedDate = date
    ? availability.filter((b) => localDateKey(b.startUtc) === date || localDateKey(b.endUtc) === date)
    : [];

  function validateReservation(): string | null {
    if (!date || !startTime || !endTime) return 'Preencha data, horário de início e horário de término.';
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Data ou horário inválido.';
    if (start >= end) return 'O horário de início deve ser antes do horário de término.';

    const now = new Date();
    const minAdvanceHours = area?.minAdvanceHours ?? 0;
    const minStart = new Date(now.getTime() + minAdvanceHours * 3_600_000);
    if (start < minStart) {
      return minAdvanceHours > 0
        ? `A reserva precisa ser feita com pelo menos ${minAdvanceHours}h de antecedência.`
        : 'Escolha um horário no futuro.';
    }
    if (area?.maxAdvanceDays != null) {
      const maxStart = new Date(now.getTime() + area.maxAdvanceDays * 86_400_000);
      if (start > maxStart) return `A reserva não pode ser feita com mais de ${area.maxAdvanceDays} dias de antecedência.`;
    }
    if (area?.maxDurationMinutes != null) {
      const durationMin = (end.getTime() - start.getTime()) / 60_000;
      if (durationMin > area.maxDurationMinutes) return `A duração máxima permitida é de ${area.maxDurationMinutes} minutos.`;
    }
    const openHHmm = formatTimeHHmm(area?.openTime);
    const closeHHmm = formatTimeHHmm(area?.closeTime);
    if (openHHmm && startTime < openHHmm) return `A área abre às ${openHHmm}.`;
    if (closeHHmm && endTime > closeHHmm) return `A área fecha às ${closeHHmm}.`;

    const guests = guestsCount ? Number(guestsCount) : undefined;
    if (guests != null && area?.capacity != null && guests > area.capacity) {
      return `Este espaço comporta no máximo ${area.capacity} pessoas.`;
    }

    const conflict = availability.some((b) => rangesOverlap(start, end, new Date(b.startUtc), new Date(b.endUtc)));
    if (conflict) return 'Esse horário já está reservado. Escolha outro horário.';

    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateReservation();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const created = await createReservation(condoId, areaId, {
        startUtc: start.toISOString(),
        endUtc: end.toISOString(),
        title: title.trim() || undefined,
        guestsCount: guestsCount ? Number(guestsCount) : undefined,
      });
      setSuccess(created);
      setTitle('');
      setGuestsCount('');
      loadAvailability();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 409) setFormError(msg ?? 'Esse horário já está reservado. Escolha outro horário.');
      else setFormError(msg ?? 'Não foi possível criar a reserva. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (!canViewAreas) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-fg font-bold text-lg">Vínculo de morador necessário</p>
        <p className="text-sm text-muted-fg">Só moradores aprovados pelo síndico podem reservar as áreas comuns deste condomínio.</p>
        <Link href={`/condominios/${condoId}/vincular`}><Button variant="primary">Solicitar vínculo de morador</Button></Link>
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

      {loadingArea ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-56 rounded-full animate-shimmer" />
          <div className="h-24 w-full rounded-2xl animate-shimmer" />
        </div>
      ) : areaError ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-fg font-bold text-lg">{areaError}</p>
          <Link href={`/condominios/${condoId}/areas-comuns`}><Button variant="primary">Voltar</Button></Link>
        </div>
      ) : area ? (
        <>
          {/* Header */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <DoorIcon />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold text-fg leading-tight">{area.name}</h1>
                {area.description && <p className="text-muted-fg text-sm mt-1">{area.description}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`px-2.5 py-1 rounded-full ${area.requiresApproval ? 'bg-accent/15 text-accent' : 'bg-secondary/15 text-secondary'}`}>
                {area.requiresApproval ? 'Reserva sujeita a aprovação do síndico' : 'Reserva confirmada automaticamente'}
              </span>
              {area.capacity != null && (
                <span className="px-2.5 py-1 rounded-full bg-muted text-muted-fg">Até {area.capacity} pessoas</span>
              )}
              {(area.openTime || area.closeTime) && (
                <span className="px-2.5 py-1 rounded-full bg-muted text-muted-fg">
                  Funcionamento {formatTimeHHmm(area.openTime) || '00:00'}–{formatTimeHHmm(area.closeTime) || '23:59'}
                </span>
              )}
            </div>

            {area.rules && (
              <div className="rounded-xl bg-muted p-3 text-sm text-fg/80 leading-relaxed whitespace-pre-line">
                <p className="font-semibold text-fg mb-1">Regras de uso</p>
                {area.rules}
              </div>
            )}

            <p className="text-xs text-muted-fg">
              Antecedência mínima: {area.minAdvanceHours > 0 ? `${area.minAdvanceHours}h` : 'nenhuma'} · Antecedência máxima: {area.maxAdvanceDays} dias
              {area.maxDurationMinutes != null && ` · Duração máxima: ${area.maxDurationMinutes} min`}
            </p>
          </div>

          {/* Success banner */}
          {success && (
            <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3 space-y-1">
              <p className="text-sm font-bold text-secondary">
                {success.status === 'Approved' ? 'Reserva confirmada!' : 'Reserva enviada para aprovação do síndico.'}
              </p>
              <p className="text-xs text-secondary/80">{formatRangePtBR(success.startUtc, success.endUtc)}</p>
              <Link href={`/condominios/${condoId}/minhas-reservas`} className="text-xs font-semibold text-secondary hover:underline">
                Ver minhas reservas
              </Link>
            </div>
          )}

          {/* Reservation form */}
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
            <p className="font-bold text-fg">Nova reserva</p>

            {formError && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{formError}</p>
            )}

            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Data</label>
              <input
                type="date"
                aria-label="Data"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayStr()}
                max={addDaysStr(area.maxAdvanceDays)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-fg mb-1 block">Início</label>
                <input
                  type="time"
                  aria-label="Horário de início"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-fg mb-1 block">Término</label>
                <input
                  type="time"
                  aria-label="Horário de término"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
                />
              </div>
            </div>

            {/* Busy times for selected date */}
            {date && (
              <div className="text-xs text-muted-fg">
                {loadingAvailability ? (
                  <span>Carregando horários ocupados…</span>
                ) : busyOnSelectedDate.length === 0 ? (
                  <span className="text-secondary font-medium">Nenhum horário ocupado nesta data.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="font-medium">Já reservado:</span>
                    {busyOnSelectedDate.map((b, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium">
                        {formatTimePtBR(b.startUtc)}–{formatTimePtBR(b.endUtc)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-fg mb-1 block">Motivo (opcional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Ex: Aniversário"
                maxLength={120}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
              />
            </div>

            {area.capacity != null && (
              <div>
                <label className="text-xs font-medium text-muted-fg mb-1 block">Nº de convidados (opcional, máx. {area.capacity})</label>
                <input
                  type="number"
                  aria-label="Número de convidados"
                  min={0}
                  max={area.capacity}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
                />
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={submitting}>
              {area.requiresApproval ? 'Enviar reserva para aprovação' : 'Confirmar reserva'}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
