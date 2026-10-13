// Espelha frontend/src/lib/types/community.ts — diretório de grupos WhatsApp,
// condomínios/síndico e alertas de segurança (features que já existem no
// backend + web mas faltavam no mobile).

export type WhatsAppGroupKind =
  | 'Predio'
  | 'Condominio'
  | 'Rua'
  | 'Bairro'
  | 'Comercio'
  | 'Interesse';

export type WhatsAppGroupStatus = 'PendingReview' | 'Verified' | 'Rejected';

export interface WhatsAppGroupSummary {
  id: number;
  name: string;
  description: string | null;
  kind: WhatsAppGroupKind;
  coverImageUrl: string | null;
  memberCountApprox: number | null;
  isManagedByPlatform: boolean;
  clickCount: number;
  condominiumId: number | null;
  condominiumName: string | null;
  createdAt: string;
}

export interface WhatsAppGroupDetail extends WhatsAppGroupSummary {
  bairroId: number;
  inviteUrl: string;
  status: WhatsAppGroupStatus;
  submittedByUserId: string | null;
  verifiedAt: string | null;
}

export const WHATSAPP_KIND_LABELS: Record<WhatsAppGroupKind, string> = {
  Predio: 'Prédio',
  Condominio: 'Condomínio',
  Rua: 'Rua',
  Bairro: 'Bairro',
  Comercio: 'Comércio',
  Interesse: 'Interesse',
};

export type CondominiumStatus = 'Unclaimed' | 'ClaimPending' | 'Claimed';
export type CondominiumRole = 'Sindico' | 'SubSindico' | 'Administradora' | 'Conselheiro';

export interface CondominiumSummary {
  id: number;
  name: string;
  description: string | null;
  addressLine: string | null;
  cep: string | null;
  coverImageUrl: string | null;
  unitsCount: number | null;
  status: CondominiumStatus;
  sindicoName: string | null;
  groupCount: number;
  createdAt: string;
}

export interface CondominiumGroup {
  id: number;
  name: string;
  kind: WhatsAppGroupKind;
  memberCountApprox: number | null;
  isManagedByPlatform: boolean;
}

export interface CondominiumDetail {
  id: number;
  bairroId: number;
  name: string;
  description: string | null;
  addressLine: string | null;
  cep: string | null;
  coverImageUrl: string | null;
  unitsCount: number | null;
  status: CondominiumStatus;
  sindicoUserId: string | null;
  sindicoName: string | null;
  sindicoRole: CondominiumRole | null;
  isManagedByPlatform: boolean;
  createdAt: string;
  groups: CondominiumGroup[];
  myClaimStatus: string | null;
  isMySindico: boolean;
}

export const CONDOMINIUM_STATUS_LABELS: Record<CondominiumStatus, string> = {
  Unclaimed: 'Sem síndico',
  ClaimPending: 'Reivindicação em análise',
  Claimed: 'Com síndico',
};

export type SecurityAlertKind = 'Furto' | 'Suspeito' | 'Incendio' | 'Acidente' | 'Outros';
export type SecurityAlertStatus = 'Active' | 'Resolved';

export interface SecurityAlertSummary {
  id: number;
  bairroId: number;
  kind: SecurityAlertKind;
  description: string;
  locationDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  status: SecurityAlertStatus;
  upvoteCount: number;
  reportedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const SECURITY_ALERT_KIND_LABELS: Record<SecurityAlertKind, string> = {
  Furto: 'Furto',
  Suspeito: 'Pessoa Suspeita',
  Incendio: 'Incêndio',
  Acidente: 'Acidente',
  Outros: 'Outros',
};
