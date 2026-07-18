import api from '@/lib/api';
import type {
  MyResidentInfo, CondominiumResident, CondominiumResidentStatus,
  CommonAreaSummary, CommonAreaDetail, CommonAreaInput,
  AreaReservation, AreaReservationStatus, AvailabilityBlock,
} from '@/lib/types/reservations';

// ─── Vínculo de morador ──────────────────────────────────────────────────────

export async function requestResidency(condominiumId: number, body?: { unit?: string }): Promise<{ id: number; status: string }> {
  const { data } = await api.post(`/api/v1/condominiums/${condominiumId}/residents`, body ?? {});
  return data;
}

export async function getMyResidentStatus(condominiumId: number): Promise<MyResidentInfo> {
  const { data } = await api.get<MyResidentInfo>(`/api/v1/condominiums/${condominiumId}/residents/me`);
  return data;
}

export async function getResidents(
  condominiumId: number,
  params?: { status?: CondominiumResidentStatus; page?: number },
): Promise<CondominiumResident[]> {
  const { data } = await api.get<CondominiumResident[]>(`/api/v1/condominiums/${condominiumId}/residents`, { params });
  return data;
}

export async function approveResident(condominiumId: number, residentId: number): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/residents/${residentId}/approve`);
}

export async function rejectResident(condominiumId: number, residentId: number, reviewNote?: string): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/residents/${residentId}/reject`, { reviewNote });
}

export async function revokeResident(condominiumId: number, residentId: number, reviewNote?: string): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/residents/${residentId}/revoke`, { reviewNote });
}

// ─── Áreas comuns ────────────────────────────────────────────────────────────

export async function getCommonAreas(condominiumId: number): Promise<CommonAreaSummary[]> {
  const { data } = await api.get<CommonAreaSummary[]>(`/api/v1/condominiums/${condominiumId}/common-areas`);
  return data;
}

export async function getCommonArea(condominiumId: number, areaId: number): Promise<CommonAreaDetail> {
  const { data } = await api.get<CommonAreaDetail>(`/api/v1/condominiums/${condominiumId}/common-areas/${areaId}`);
  return data;
}

export async function createCommonArea(condominiumId: number, body: CommonAreaInput): Promise<CommonAreaDetail> {
  const { data } = await api.post<CommonAreaDetail>(`/api/v1/condominiums/${condominiumId}/common-areas`, body);
  return data;
}

export async function updateCommonArea(condominiumId: number, areaId: number, body: CommonAreaInput): Promise<CommonAreaDetail> {
  const { data } = await api.put<CommonAreaDetail>(`/api/v1/condominiums/${condominiumId}/common-areas/${areaId}`, body);
  return data;
}

export async function deleteCommonArea(condominiumId: number, areaId: number): Promise<void> {
  await api.delete(`/api/v1/condominiums/${condominiumId}/common-areas/${areaId}`);
}

export async function getAreaAvailability(
  condominiumId: number,
  areaId: number,
  params: { from: string; to: string },
): Promise<AvailabilityBlock[]> {
  const { data } = await api.get<AvailabilityBlock[]>(
    `/api/v1/condominiums/${condominiumId}/common-areas/${areaId}/availability`,
    { params },
  );
  return data;
}

// ─── Reservas ────────────────────────────────────────────────────────────────

export async function createReservation(
  condominiumId: number,
  areaId: number,
  body: { startUtc: string; endUtc: string; title?: string; guestsCount?: number },
): Promise<AreaReservation> {
  const { data } = await api.post<AreaReservation>(
    `/api/v1/condominiums/${condominiumId}/common-areas/${areaId}/reservations`,
    body,
  );
  return data;
}

export async function getMyReservations(condominiumId: number): Promise<AreaReservation[]> {
  const { data } = await api.get<AreaReservation[]>(`/api/v1/condominiums/${condominiumId}/reservations/mine`);
  return data;
}

export async function cancelReservation(condominiumId: number, reservationId: number): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/reservations/${reservationId}/cancel`);
}

export async function getReservations(
  condominiumId: number,
  params?: { areaId?: number; status?: AreaReservationStatus; from?: string; to?: string; page?: number },
): Promise<AreaReservation[]> {
  const { data } = await api.get<AreaReservation[]>(`/api/v1/condominiums/${condominiumId}/reservations`, { params });
  return data;
}

export async function getPendingReservations(condominiumId: number): Promise<AreaReservation[]> {
  const { data } = await api.get<AreaReservation[]>(`/api/v1/condominiums/${condominiumId}/reservations/pending`);
  return data;
}

export async function approveReservation(condominiumId: number, reservationId: number): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/reservations/${reservationId}/approve`);
}

export async function rejectReservation(condominiumId: number, reservationId: number, reviewNote?: string): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/reservations/${reservationId}/reject`, { reviewNote });
}
