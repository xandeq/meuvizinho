// Helpers de formatação/validação compartilhados pelas telas de reserva de áreas comuns.
// Todos os horários trafegam em UTC (StartUtc/EndUtc); aqui convertemos para o fuso do navegador
// (America/Sao_Paulo, para usuários do Meu Vizinho) apenas na exibição.

export function formatTimeHHmm(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export function formatDatePtBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatTimePtBR(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTimePtBR(iso: string): string {
  return `${formatDatePtBR(iso)} ${formatTimePtBR(iso)}`;
}

export function formatRangePtBR(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${formatDatePtBR(startIso)} · ${formatTimePtBR(startIso)}–${formatTimePtBR(endIso)}`;
  }
  return `${formatDateTimePtBR(startIso)} – ${formatDateTimePtBR(endIso)}`;
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
