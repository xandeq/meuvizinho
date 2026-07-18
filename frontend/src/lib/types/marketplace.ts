// Phase 4 Plan 02: Marketplace + Chat DTO types.
// Mirror BairroNow.Api.Models.DTOs.MarketplaceDtos / ChatDtos (04-01 backend).
// Note: backend uses int for Listing/Conversation/Message ids and Guid for user ids.

export type ListingStatus = "active" | "sold" | "removed" | "expired";

export interface ListingPhoto {
  id: number;
  orderIndex: number;
  url: string;
  thumbnailUrl: string;
}

export interface ListingDto {
  id: number;
  sellerId: string; // Guid
  sellerDisplayName: string;
  sellerIsVerified: boolean;
  sellerIsPremium?: boolean;
  bairroId: number;
  title: string;
  description: string;
  price: number;
  categoryCode: string;
  subcategoryCode: string;
  status: ListingStatus;
  createdAt: string;
  soldAt: string | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  photos: ListingPhoto[];
  favoriteCount: number;
  isFavoritedByCurrentUser: boolean;
}

export interface ListingPageResult {
  items: ListingDto[];
  nextCursor: string | null;
}

export type ListingReportReason =
  | "Spam"
  | "Offensive"
  | "Discrimination"
  | "Misinformation"
  | "Other";

// UI-facing report reason codes (D-20). Mapped to backend ReportReason enum on submit.
export type ListingReportReasonCode =
  | "prohibited"
  | "fraud"
  | "abusive-price"
  | "misleading";

export const LISTING_REPORT_REASONS: Array<{
  code: ListingReportReasonCode;
  label: string;
  backend: ListingReportReason;
}> = [
  { code: "prohibited", label: "Item proibido", backend: "Other" },
  { code: "fraud", label: "Suspeita de fraude / golpe", backend: "Other" },
  { code: "abusive-price", label: "Preço abusivo", backend: "Other" },
  { code: "misleading", label: "Descrição enganosa", backend: "Misinformation" },
];

export interface ReportListingRequest {
  reason: ListingReportReason;
  note: string | null;
}

export interface RatingDto {
  id: number;
  sellerId: string;
  buyerId: string;
  buyerDisplayName: string | null;
  listingId: number;
  stars: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerRatingsResponse {
  sellerId: string;
  average: number;
  count: number;
  ratings: RatingDto[];
}

export interface SubcategoryDto {
  code: string;
  displayName: string;
}

export interface CategoryDto {
  code: string;
  displayName: string;
  enabled: boolean;
  subcategories: SubcategoryDto[];
}

// Chat

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  sentAt: string;
}

export interface ConversationDto {
  id: number;
  listingId: number | null;
  listingTitle: string | null;
  listingThumbnailUrl: string | null;
  otherUserId: string;
  otherUserDisplayName: string | null;
  otherUserPhotoUrl: string | null;
  otherUserIsVerified: boolean;
  lastMessageAt: string;
  unreadCount: number;
}

export interface UnreadCountResponse {
  total: number;
}
