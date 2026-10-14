import { apiClient } from '../api';
import type {
  MyResidentInfo,
  CommonAreaSummary,
  CommonAreaDetail,
  AreaReservation,
  AvailabilityBlock,
  AnnouncementSummary,
  AnnouncementDetail,
  IncidentDto,
  IncidentCategory,
  IncidentStatus,
} from './condo.types';

// Lado do morador: vínculo, comunicados e reservas. A gestão do síndico
// (aprovar moradores/reservas, CRUD de áreas e comunicados) fica no site.
const base = (condominiumId: number) => `/api/v1/condominiums/${condominiumId}`;

// ─── Vínculo de morador ──────────────────────────────────────────────────────

export async function getMyResidentStatus(condominiumId: number): Promise<MyResidentInfo> {
  const { data } = await apiClient.get<MyResidentInfo>(`${base(condominiumId)}/residents/me`);
  return data;
}

export async function requestResidency(condominiumId: number, body: { unit?: string }): Promise<{ id: number; status: string }> {
  const { data } = await apiClient.post(`${base(condominiumId)}/residents`, body);
  return data;
}

// ─── Comunicados ─────────────────────────────────────────────────────────────

export async function getAnnouncements(condominiumId: number): Promise<AnnouncementSummary[]> {
  const { data } = await apiClient.get<AnnouncementSummary[]>(`${base(condominiumId)}/announcements`);
  return data;
}

export async function getAnnouncement(condominiumId: number, announcementId: number): Promise<AnnouncementDetail> {
  const { data } = await apiClient.get<AnnouncementDetail>(`${base(condominiumId)}/announcements/${announcementId}`);
  return data;
}

// ─── Áreas comuns e reservas ─────────────────────────────────────────────────

export async function getCommonAreas(condominiumId: number): Promise<CommonAreaSummary[]> {
  const { data } = await apiClient.get<CommonAreaSummary[]>(`${base(condominiumId)}/common-areas`);
  return data;
}

export async function getCommonArea(condominiumId: number, areaId: number): Promise<CommonAreaDetail> {
  const { data } = await apiClient.get<CommonAreaDetail>(`${base(condominiumId)}/common-areas/${areaId}`);
  return data;
}

export async function getAreaAvailability(
  condominiumId: number,
  areaId: number,
  params: { from: string; to: string }
): Promise<AvailabilityBlock[]> {
  const { data } = await apiClient.get<AvailabilityBlock[]>(
    `${base(condominiumId)}/common-areas/${areaId}/availability`,
    { params }
  );
  return data;
}

export async function createReservation(
  condominiumId: number,
  areaId: number,
  body: { startUtc: string; endUtc: string; title?: string; guestsCount?: number }
): Promise<AreaReservation> {
  const { data } = await apiClient.post<AreaReservation>(
    `${base(condominiumId)}/common-areas/${areaId}/reservations`,
    body
  );
  return data;
}

export async function getMyReservations(condominiumId: number): Promise<AreaReservation[]> {
  const { data } = await apiClient.get<AreaReservation[]>(`${base(condominiumId)}/reservations/mine`);
  return data;
}

export async function cancelReservation(condominiumId: number, reservationId: number): Promise<void> {
  await apiClient.post(`${base(condominiumId)}/reservations/${reservationId}/cancel`);
}

// ─── Ocorrências ─────────────────────────────────────────────────────────────

export async function createIncident(
  condominiumId: number,
  body: { category: IncidentCategory; title: string; description: string; location?: string }
): Promise<IncidentDto> {
  const { data } = await apiClient.post<IncidentDto>(`${base(condominiumId)}/incidents`, body);
  return data;
}

export async function getMyIncidents(condominiumId: number): Promise<IncidentDto[]> {
  const { data } = await apiClient.get<IncidentDto[]>(`${base(condominiumId)}/incidents/mine`);
  return data;
}

// Gestão (síndico/admin): todas as ocorrências do condomínio.
export async function getAllIncidents(condominiumId: number): Promise<IncidentDto[]> {
  const { data } = await apiClient.get<IncidentDto[]>(`${base(condominiumId)}/incidents`);
  return data;
}

export async function getIncident(condominiumId: number, incidentId: number): Promise<IncidentDto> {
  const { data } = await apiClient.get<IncidentDto>(`${base(condominiumId)}/incidents/${incidentId}`);
  return data;
}

export async function updateIncidentStatus(
  condominiumId: number,
  incidentId: number,
  body: { status: IncidentStatus; responseNote?: string }
): Promise<IncidentDto> {
  const { data } = await apiClient.post<IncidentDto>(`${base(condominiumId)}/incidents/${incidentId}/status`, body);
  return data;
}
