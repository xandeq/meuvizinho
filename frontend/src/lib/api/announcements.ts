import api from '@/lib/api';
import type {
  AnnouncementSummary, AnnouncementDetail, ManagedAnnouncement, AnnouncementInput,
} from '@/lib/types/announcements';

// ─── Comunicados oficiais do síndico ────────────────────────────────────────

export async function getAnnouncements(
  condominiumId: number,
  params?: { page?: number },
): Promise<AnnouncementSummary[]> {
  const { data } = await api.get<AnnouncementSummary[]>(
    `/api/v1/condominiums/${condominiumId}/announcements`,
    { params },
  );
  return data;
}

export async function getAnnouncement(condominiumId: number, announcementId: number): Promise<AnnouncementDetail> {
  const { data } = await api.get<AnnouncementDetail>(
    `/api/v1/condominiums/${condominiumId}/announcements/${announcementId}`,
  );
  return data;
}

export async function getManagedAnnouncements(
  condominiumId: number,
  params?: { page?: number; includeDeleted?: boolean },
): Promise<ManagedAnnouncement[]> {
  const { data } = await api.get<ManagedAnnouncement[]>(
    `/api/v1/condominiums/${condominiumId}/announcements/manage`,
    { params },
  );
  return data;
}

export async function createAnnouncement(condominiumId: number, body: AnnouncementInput): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>(`/api/v1/condominiums/${condominiumId}/announcements`, body);
  return data;
}

export async function updateAnnouncement(
  condominiumId: number,
  announcementId: number,
  body: AnnouncementInput,
): Promise<void> {
  await api.put(`/api/v1/condominiums/${condominiumId}/announcements/${announcementId}`, body);
}

export async function deleteAnnouncement(condominiumId: number, announcementId: number): Promise<void> {
  await api.delete(`/api/v1/condominiums/${condominiumId}/announcements/${announcementId}`);
}

export async function pinAnnouncement(condominiumId: number, announcementId: number): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/announcements/${announcementId}/pin`);
}

export async function unpinAnnouncement(condominiumId: number, announcementId: number): Promise<void> {
  await api.post(`/api/v1/condominiums/${condominiumId}/announcements/${announcementId}/unpin`);
}
