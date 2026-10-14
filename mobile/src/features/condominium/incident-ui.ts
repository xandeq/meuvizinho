// Visual compartilhado das ocorrências (lista, detalhe, nova).
import type { Ionicons } from '@expo/vector-icons';
import type { IncidentCategory, IncidentStatus } from '../../lib/api/condo.types';
import { INCIDENT_CATEGORIES } from '../../lib/api/condo.types';

type IconName = keyof typeof Ionicons.glyphMap;

export function categoryMeta(code: IncidentCategory): { label: string; icon: IconName } {
  const found = INCIDENT_CATEGORIES.find((c) => c.code === code) ?? INCIDENT_CATEGORIES[INCIDENT_CATEGORIES.length - 1];
  return { label: found.label, icon: found.icon as IconName };
}

// Cor do status vem do tema: aberta = âmbar (atenção), andamento = azul,
// resolvida = verde de confirmação, recusada = vermelho.
export function statusTone(status: IncidentStatus): 'accent' | 'primary' | 'verified' | 'danger' {
  switch (status) {
    case 'Aberta':
      return 'accent';
    case 'EmAndamento':
      return 'primary';
    case 'Resolvida':
      return 'verified';
    default:
      return 'danger';
  }
}

export const STATUS_ICON: Record<IncidentStatus, IconName> = {
  Aberta: 'radio-button-on',
  EmAndamento: 'hammer-outline',
  Resolvida: 'checkmark-circle',
  Recusada: 'close-circle',
};

// Passos da linha do tempo (Recusada substitui Resolvida no fim).
export function timelineSteps(status: IncidentStatus): { key: IncidentStatus; done: boolean }[] {
  const last: IncidentStatus = status === 'Recusada' ? 'Recusada' : 'Resolvida';
  const order: IncidentStatus[] = ['Aberta', 'EmAndamento', last];
  const reached = status === 'Recusada' ? 2 : order.indexOf(status);
  return order.map((key, i) => ({ key, done: i <= reached }));
}

export function relativeDate(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return days === 1 ? 'ontem' : `há ${days} dias`;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
