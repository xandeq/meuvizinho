// Comunicados oficiais do síndico (Wave T).
// Espelha os DTOs de CondominiumAnnouncementsController.

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

export interface ManagedAnnouncement extends AnnouncementSummary {
  isExpired: boolean;
  deletedAt: string | null;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  isImportant?: boolean;
  isPinned?: boolean;
  expiresAt?: string;
}
