// Morador, comunicados e reservas de áreas comuns de condomínio.
// Espelha frontend/src/lib/types/{reservations,announcements}.ts (DTOs dos controllers
// CondominiumReservationsController e CondominiumAnnouncementsController).

export type CondominiumResidentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revoked';
export type MyResidentStatus = 'None' | CondominiumResidentStatus;

export interface MyResidentInfo {
  status: MyResidentStatus;
  unit: string | null;
  reviewNote: string | null;
}

export interface CommonAreaSummary {
  id: number;
  condominiumId: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  capacity: number | null;
  requiresApproval: boolean;
  openTime: string | null;
  closeTime: string | null;
  isActive: boolean;
}

export interface CommonAreaDetail extends CommonAreaSummary {
  rules: string | null;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  maxDurationMinutes: number | null;
  createdByUserId: string | null;
  createdAt: string;
}

export type AreaReservationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface AreaReservation {
  id: number;
  commonAreaId: number;
  commonAreaName: string | null;
  condominiumId: number;
  userId: string;
  userName: string | null;
  title: string | null;
  guestsCount: number | null;
  startUtc: string;
  endUtc: string;
  status: AreaReservationStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AvailabilityBlock {
  startUtc: string;
  endUtc: string;
  status: 'Pending' | 'Approved';
}

export interface AnnouncementSummary {
  id: number;
  title: string;
  bodyPreview: string;
  isImportant: boolean;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  authorName: string | null;
  authorVerified: boolean;
}

export interface AnnouncementDetail {
  id: number;
  condominiumId: number;
  title: string;
  body: string;
  isImportant: boolean;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  authorName: string | null;
  authorVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export const RESIDENT_STATUS_LABELS: Record<MyResidentStatus, string> = {
  None: 'Sem vínculo',
  Pending: 'Solicitação em análise',
  Approved: 'Vínculo aprovado',
  Rejected: 'Solicitação recusada',
  Revoked: 'Vínculo revogado',
};

export const RESERVATION_STATUS_LABELS: Record<AreaReservationStatus, string> = {
  Pending: 'Aguardando aprovação',
  Approved: 'Aprovada',
  Rejected: 'Recusada',
  Cancelled: 'Cancelada',
};

// ─── Ocorrências (morador → síndico) ─────────────────────────────────────────

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

export const INCIDENT_CATEGORIES: { code: IncidentCategory; label: string; icon: string }[] = [
  { code: 'Manutencao', label: 'Manutenção', icon: 'construct-outline' },
  { code: 'Limpeza', label: 'Limpeza', icon: 'sparkles-outline' },
  { code: 'Seguranca', label: 'Segurança', icon: 'shield-outline' },
  { code: 'Barulho', label: 'Barulho', icon: 'volume-high-outline' },
  { code: 'AreaComum', label: 'Área comum', icon: 'business-outline' },
  { code: 'Outros', label: 'Outros', icon: 'ellipsis-horizontal-circle-outline' },
];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  Resolvida: 'Resolvida',
  Recusada: 'Recusada',
};
