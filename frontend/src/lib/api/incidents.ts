import api from '@/lib/api';
import type { IncidentDto, IncidentCategory, IncidentStatus } from '@/lib/types/incidents';

const base = (condominiumId: number) => `/api/v1/condominiums/${condominiumId}/incidents`;

export async function createIncident(
  condominiumId: number,
  body: { category: IncidentCategory; title: string; description: string; location?: string },
): Promise<IncidentDto> {
  const { data } = await api.post<IncidentDto>(base(condominiumId), body);
  return data;
}

export async function getMyIncidents(condominiumId: number): Promise<IncidentDto[]> {
  const { data } = await api.get<IncidentDto[]>(`${base(condominiumId)}/mine`);
  return data;
}

// Gestão (síndico/admin).
export async function getAllIncidents(condominiumId: number, status?: IncidentStatus): Promise<IncidentDto[]> {
  const { data } = await api.get<IncidentDto[]>(base(condominiumId), { params: status ? { status } : undefined });
  return data;
}

export async function updateIncidentStatus(
  condominiumId: number,
  incidentId: number,
  body: { status: IncidentStatus; responseNote?: string },
): Promise<IncidentDto> {
  const { data } = await api.post<IncidentDto>(`${base(condominiumId)}/${incidentId}/status`, body);
  return data;
}
