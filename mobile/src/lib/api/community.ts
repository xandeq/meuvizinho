import { apiClient } from '../api';
import type {
  WhatsAppGroupSummary,
  WhatsAppGroupDetail,
  WhatsAppGroupKind,
  CondominiumSummary,
  CondominiumDetail,
  CondominiumRole,
  SecurityAlertSummary,
  SecurityAlertKind,
} from './community.types';

// ─── Diretório de grupos de WhatsApp ────────────────────────────────────────

export async function getWhatsAppGroups(
  bairroId: number,
  params?: { search?: string; kind?: string }
): Promise<WhatsAppGroupSummary[]> {
  const { data } = await apiClient.get<WhatsAppGroupSummary[]>('/api/v1/whatsapp-groups', {
    params: { bairroId, ...params },
  });
  return data;
}

export async function getWhatsAppGroup(id: number): Promise<WhatsAppGroupDetail> {
  const { data } = await apiClient.get<WhatsAppGroupDetail>(`/api/v1/whatsapp-groups/${id}`);
  return data;
}

export async function submitWhatsAppGroup(body: {
  bairroId: number;
  name: string;
  inviteUrl: string;
  kind: WhatsAppGroupKind;
  description?: string;
  memberCountApprox?: number;
  condominiumId?: number;
}): Promise<{ id: number; status: string }> {
  const { data } = await apiClient.post('/api/v1/whatsapp-groups', body);
  return data;
}

export async function clickWhatsAppGroup(id: number): Promise<{ inviteUrl: string; clickCount: number }> {
  const { data } = await apiClient.post(`/api/v1/whatsapp-groups/${id}/click`);
  return data;
}

// ─── Condomínios + síndico ──────────────────────────────────────────────────

export async function getCondominiums(
  bairroId: number,
  params?: { search?: string }
): Promise<CondominiumSummary[]> {
  const { data } = await apiClient.get<CondominiumSummary[]>('/api/v1/condominiums', {
    params: { bairroId, ...params },
  });
  return data;
}

export async function getCondominium(id: number): Promise<CondominiumDetail> {
  const { data } = await apiClient.get<CondominiumDetail>(`/api/v1/condominiums/${id}`);
  return data;
}

export async function createCondominium(body: {
  bairroId: number;
  name: string;
  description?: string;
  addressLine?: string;
  cep?: string;
  unitsCount?: number;
}): Promise<{ id: number; name: string }> {
  const { data } = await apiClient.post('/api/v1/condominiums', body);
  return data;
}

export async function claimCondominium(
  id: number,
  body: { requestedRole?: CondominiumRole; justification: string; evidenceUrl?: string }
): Promise<{ id: number; status: string }> {
  const { data } = await apiClient.post(`/api/v1/condominiums/${id}/claims`, body);
  return data;
}

// ─── Alertas de Segurança ───────────────────────────────────────────────────

export async function getSecurityAlerts(
  bairroId: number,
  params?: { kind?: string; status?: string }
): Promise<SecurityAlertSummary[]> {
  const { data } = await apiClient.get<SecurityAlertSummary[]>('/api/v1/security-alerts', {
    params: { bairroId, ...params },
  });
  return data;
}

export async function createSecurityAlert(body: {
  bairroId: number;
  kind: SecurityAlertKind;
  description: string;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ id: number; kind: string; status: string }> {
  const { data } = await apiClient.post('/api/v1/security-alerts', body);
  return data;
}

export async function upvoteSecurityAlert(id: number): Promise<{ upvoteCount: number }> {
  const { data } = await apiClient.post(`/api/v1/security-alerts/${id}/upvote`);
  return data;
}
