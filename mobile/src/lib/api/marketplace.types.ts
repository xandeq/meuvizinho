// DTOs mirroring src/NossoVizinho.Api/Models/DTOs/MarketplaceDtos.cs

export interface ListingPhotoDto {
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
  bairroId: number;
  title: string;
  description: string;
  price: number;
  categoryCode: string;
  subcategoryCode: string;
  status: 'active' | 'sold' | 'removed' | 'expired' | string;
  createdAt: string;
  soldAt: string | null;
  photos: ListingPhotoDto[];
  favoriteCount: number;
  isFavoritedByCurrentUser: boolean;
}

export interface ListingPageResult {
  items: ListingDto[];
  nextCursor: string | null;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  categoryCode: string;
  subcategoryCode: string;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  categoryCode?: string;
  subcategoryCode?: string;
}

export interface ListingPhotoAsset {
  uri: string;
  name: string;
  type: string;
}

// Categories
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

// Ratings
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

export interface CreateRatingRequest {
  stars: number;
  comment?: string;
  listingId: number;
}

// Reports — values mirror NossoVizinho.Api.Models.Enums.ReportReason
export enum ReportListingReason {
  ProhibitedItem = 0,
  ScamSuspicion = 1,
  AbusivePricing = 2,
  MisleadingDescription = 3,
}

export const REPORT_REASON_LABELS: Record<ReportListingReason, string> = {
  [ReportListingReason.ProhibitedItem]: 'Item proibido',
  [ReportListingReason.ScamSuspicion]: 'Suspeita de golpe / fraude',
  [ReportListingReason.AbusivePricing]: 'Preço abusivo',
  [ReportListingReason.MisleadingDescription]: 'Descrição enganosa',
};
