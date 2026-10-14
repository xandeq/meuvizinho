// Lógica pura do seletor de horário de reserva (sem RN), testável em jest.
// Trabalha em hora local do aparelho (Brasília para o público do app); a janela
// diária da área (openTime/closeTime) é a hora local digitada pelo síndico.

export interface AreaRules {
  openTime: string | null;
  closeTime: string | null;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  maxDurationMinutes: number | null;
}

export interface BusyRange {
  startUtc: string;
  endUtc: string;
}

export interface DayOption {
  key: string;
  date: Date;
  topLabel: string;
  bottomLabel: string;
}

export interface SlotOption {
  minutes: number;
  label: string;
  disabled: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DURATION_CHOICES = [30, 60, 90, 120, 180, 240, 300, 360, 480];
const DEFAULT_MAX_DURATION = 480;

const pad = (n: number) => String(n).padStart(2, '0');

export function parseHHmm(t: string | null | undefined, fallback: number): number {
  if (!t) return fallback;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return fallback;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function minutesLabel(minutes: number): string {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

export function atMinutes(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dailyWindow(rules: AreaRules): { open: number; close: number } {
  const open = parseHHmm(rules.openTime, 0);
  let close = parseHHmm(rules.closeTime, 1440);
  if (close <= open) close = 1440;
  return { open, close };
}

function overlapsBusy(start: Date, end: Date, busy: BusyRange[]): boolean {
  return busy.some((b) => start < new Date(b.endUtc) && new Date(b.startUtc) < end);
}

function bookableNow(start: Date, rules: AreaRules, now: Date): boolean {
  const minStart = now.getTime() + rules.minAdvanceHours * 3_600_000;
  const maxStart = now.getTime() + rules.maxAdvanceDays * 86_400_000;
  return start.getTime() >= minStart && start.getTime() <= maxStart;
}

// Hoje + até maxAdvanceDays dias (limitado para a faixa de chips não ficar enorme).
export function bookableDays(now: Date, maxAdvanceDays: number, cap = 30): DayOption[] {
  const count = Math.min(Math.max(maxAdvanceDays, 0), cap) + 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const topLabel = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : WEEKDAYS[date.getDay()];
    return { key: dayKey(date), date, topLabel, bottomLabel: `${date.getDate()} ${MONTHS[date.getMonth()]}` };
  });
}

// Horários de início de hora em hora dentro da janela. Horários que já passaram
// somem; os bloqueados (antecedência ou já reservados) aparecem desabilitados.
export function startSlots(day: Date, rules: AreaRules, busy: BusyRange[], now: Date, step = 60): SlotOption[] {
  const { open, close } = dailyWindow(rules);
  const minDuration = Math.min(60, rules.maxDurationMinutes ?? 60, close - open);
  const slots: SlotOption[] = [];
  for (let m = open; m + minDuration <= close; m += step) {
    const start = atMinutes(day, m);
    if (start <= now) continue;
    const end = atMinutes(day, m + minDuration);
    slots.push({
      minutes: m,
      label: minutesLabel(m),
      disabled: !bookableNow(start, rules, now) || overlapsBusy(start, end, busy),
    });
  }
  return slots;
}

// Durações possíveis a partir do início escolhido, respeitando fechamento e duração máxima.
export function durationOptions(day: Date, startMinutes: number, rules: AreaRules, busy: BusyRange[]): SlotOption[] {
  const { close } = dailyWindow(rules);
  const maxDuration = Math.min(rules.maxDurationMinutes ?? DEFAULT_MAX_DURATION, close - startMinutes);
  if (maxDuration <= 0) return [];
  const choices = DURATION_CHOICES.filter((c) => c <= maxDuration);
  if (!choices.includes(maxDuration) && maxDuration < DEFAULT_MAX_DURATION) choices.push(maxDuration);
  const start = atMinutes(day, startMinutes);
  return choices.map((c) => ({
    minutes: c,
    label: formatDuration(c),
    disabled: overlapsBusy(start, atMinutes(day, startMinutes + c), busy),
  }));
}

export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()].toLowerCase()}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatDayMonth(startIso)} · ${formatTime(startIso)}–${formatTime(endIso)}`;
}
