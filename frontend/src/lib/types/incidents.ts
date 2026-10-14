// Ocorrências do condomínio (morador → síndico). Espelha CondominiumIncidentsController.

export type IncidentCategory = 'Manutencao' | 'Limpeza' | 'Seguranca' | 'Barulho' | 'AreaComum' | 'Outros';
export type IncidentStatus = 'Aberta' | 'EmAndamento' | 'Resolvida' | 'Recusada';

export interface IncidentDto {
  id: number;
  condominiumId: number;
  category: IncidentCategory;
  title: string;
  description: string;
  location: string | null;
  status: IncidentStatus;
  responseNote: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  reporterName: string | null;
  reporterVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
  closedAt: string | null;
}

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  Manutencao: 'Manutenção',
  Limpeza: 'Limpeza',
  Seguranca: 'Segurança',
  Barulho: 'Barulho',
  AreaComum: 'Área comum',
  Outros: 'Outros',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  Resolvida: 'Resolvida',
  Recusada: 'Recusada',
};
