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
