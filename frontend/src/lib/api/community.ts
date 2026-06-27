import api from '@/lib/api';
import type {
  WhatsAppGroupSummary, WhatsAppGroupDetail, WhatsAppGroupKind,
  CondominiumSummary, CondominiumDetail, CondominiumRole,
  PendingWhatsAppGroup, PendingClaim,
  SecurityAlertSummary, SecurityAlertDetail, SecurityAlertKind,
} from '@/lib/types/community';

// ─── Diretório de grupos de WhatsApp ────────────────────────────────────────

export async function getWhatsAppGroups(
  bairroId: number,
  params?: { search?: string; kind?: string; page?: number },
): Promise<WhatsAppGroupSummary[]> {
  const { data } = await api.get<WhatsAppGroupSummary[]>('/api/v1/whatsapp-groups', {
    params: { bairroId, ...params },
  });
  return data;
}

export async function getWhatsAppGroup(id: number): Promise<WhatsAppGroupDetail> {
  const { data } = await api.get<WhatsAppGroupDetail>(`/api/v1/whatsapp-groups/${id}`);
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
  const { data } = await api.post('/api/v1/whatsapp-groups', body);
  return data;
}

// Registra o clique e retorna o link de convite (funil).
export async function clickWhatsAppGroup(id: number): Promise<{ inviteUrl: string; clickCount: number }> {
  const { data } = await api.post(`/api/v1/whatsapp-groups/${id}/click`);
  return data;
}

// ─── Condomínios + síndico ──────────────────────────────────────────────────

export async function getCondominiums(
  bairroId: number,
  params?: { search?: string; page?: number },
): Promise<CondominiumSummary[]> {
  const { data } = await api.get<CondominiumSummary[]>('/api/v1/condominiums', {
    params: { bairroId, ...params },
  });
  return data;
}

export async function getCondominium(id: number): Promise<CondominiumDetail> {
  const { data } = await api.get<CondominiumDetail>(`/api/v1/condominiums/${id}`);
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
  const { data } = await api.post('/api/v1/condominiums', body);
  return data;
}

export async function claimCondominium(
  id: number,
  body: { requestedRole?: CondominiumRole; justification: string; evidenceUrl?: string },
): Promise<{ id: number; status: string }> {
  const { data } = await api.post(`/api/v1/condominiums/${id}/claims`, body);
  return data;
}

// ─── Moderação (admin) ──────────────────────────────────────────────────────

export async function getPendingWhatsAppGroups(bairroId?: number): Promise<PendingWhatsAppGroup[]> {
  const { data } = await api.get<PendingWhatsAppGroup[]>('/api/v1/whatsapp-groups/pending', {
    params: bairroId ? { bairroId } : {},
  });
  return data;
}

export async function verifyWhatsAppGroup(id: number, isManagedByPlatform?: boolean): Promise<void> {
  await api.post(`/api/v1/whatsapp-groups/${id}/verify`, { isManagedByPlatform });
}

export async function rejectWhatsAppGroup(id: number, reason: string): Promise<void> {
  await api.post(`/api/v1/whatsapp-groups/${id}/reject`, { reason });
}

export async function getPendingClaims(bairroId?: number): Promise<PendingClaim[]> {
  const { data } = await api.get<PendingClaim[]>('/api/v1/condominiums/claims/pending', {
    params: bairroId ? { bairroId } : {},
  });
  return data;
}

export async function approveClaim(claimId: number): Promise<void> {
  await api.post(`/api/v1/condominiums/claims/${claimId}/approve`);
}

export async function rejectClaim(claimId: number, note?: string): Promise<void> {
  await api.post(`/api/v1/condominiums/claims/${claimId}/reject`, { note });
}

// ─── Alertas de Segurança (Wave Q) ──────────────────────────────────────────

export async function getSecurityAlerts(
  bairroId: number,
  params?: { kind?: string; status?: string; page?: number },
): Promise<SecurityAlertSummary[]> {
  const { data } = await api.get<SecurityAlertSummary[]>('/api/v1/security-alerts', {
    params: { bairroId, ...params },
  });
  return data;
}

export async function getSecurityAlert(id: number): Promise<SecurityAlertDetail> {
  const { data } = await api.get<SecurityAlertDetail>(`/api/v1/security-alerts/${id}`);
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
  const { data } = await api.post('/api/v1/security-alerts', body);
  return data;
}

export async function upvoteSecurityAlert(id: number): Promise<{ upvoteCount: number }> {
  const { data } = await api.post(`/api/v1/security-alerts/${id}/upvote`);
  return data;
}

export async function resolveSecurityAlert(id: number, note?: string): Promise<void> {
  await api.post(`/api/v1/security-alerts/${id}/resolve`, { note });
}
