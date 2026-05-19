import imageCompression from "browser-image-compression";
import api from "@/lib/api";
import type {
  ListingDto,
  ListingPageResult,
  ReportListingRequest,
  RatingDto,
  SellerRatingsResponse,
  CategoryDto,
} from "@/lib/types/marketplace";

// Phase 4 Plan 02 Task 0: axios wrappers matching backend 04-01 controllers.
// Routes verified against src/BairroNow.Api/Controllers/v1/{Listings,SellerRatings,Categories,Moderation}Controller.cs

const BASE = "/api/v1";

export interface ListListingsParams {
  bairroId: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  sort?: string;
  cursor?: string | null;
  take?: number;
}

export interface SearchListingsParams extends ListListingsParams {
  q: string;
}

async function compressPhoto(file: File): Promise<File> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.85,
    });
    // browser-image-compression returns Blob in some paths — wrap to File.
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
    });
  } catch {
    return file;
  }
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  categoryCode: string;
  subcategoryCode: string;
  photos: File[];
}

export async function createListing(
  input: CreateListingInput
): Promise<ListingDto> {
  const fd = new FormData();
  const dataJson = JSON.stringify({
    title: input.title,
    description: input.description,
    price: input.price,
    categoryCode: input.categoryCode,
    subcategoryCode: input.subcategoryCode,
  });
  fd.append("data", dataJson);
  for (const photo of input.photos) {
    const compressed = await compressPhoto(photo);
    fd.append("photos", compressed, compressed.name);
  }
  const { data } = await api.post<ListingDto>(`${BASE}/listings`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listListings(
  params: ListListingsParams
): Promise<ListingPageResult> {
  const { data } = await api.get<ListingPageResult>(`${BASE}/listings`, {
    params: {
      bairroId: params.bairroId,
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      verifiedOnly: params.verifiedOnly ?? true,
      sort: params.sort,
      cursor: params.cursor ?? undefined,
      take: params.take ?? 20,
    },
  });
  return data;
}

export async function searchListings(
  params: SearchListingsParams
): Promise<ListingPageResult> {
  const { data } = await api.get<ListingPageResult>(`${BASE}/listings/search`, {
    params: {
      bairroId: params.bairroId,
      q: params.q,
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      verifiedOnly: params.verifiedOnly ?? true,
    },
  });
  return data;
}

export async function getListing(id: number): Promise<ListingDto> {
  const { data } = await api.get<ListingDto>(`${BASE}/listings/${id}`);
  return data;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  categoryCode?: string;
  subcategoryCode?: string;
}

export async function updateListing(
  id: number,
  input: UpdateListingInput
): Promise<ListingDto> {
  const { data } = await api.patch<ListingDto>(`${BASE}/listings/${id}`, input);
  return data;
}

export async function markSold(id: number): Promise<ListingDto> {
  const { data } = await api.post<ListingDto>(
    `${BASE}/listings/${id}/mark-sold`,
    {}
  );
  return data;
}

export async function renewListing(id: number): Promise<ListingDto> {
  const { data } = await api.post<ListingDto>(
    `${BASE}/listings/${id}/renew`,
    {}
  );
  return data;
}

export async function deleteListing(id: number): Promise<void> {
  await api.delete(`${BASE}/listings/${id}`);
}

export async function toggleFavorite(
  id: number
): Promise<{ favorited: boolean }> {
  const { data } = await api.post<{ favorited: boolean }>(
    `${BASE}/listings/${id}/favorite`,
    {}
  );
  return data;
}

export async function reportListing(
  id: number,
  body: ReportListingRequest
): Promise<void> {
  await api.post(`${BASE}/listings/${id}/report`, body);
}

export async function getSellerRatings(
  sellerId: string
): Promise<SellerRatingsResponse> {
  const { data } = await api.get<SellerRatingsResponse>(
    `${BASE}/sellers/${sellerId}/ratings`
  );
  return data;
}

export interface CreateRatingInput {
  stars: number;
  comment?: string;
  listingId: number;
}

export async function createRating(
  sellerId: string,
  body: CreateRatingInput
): Promise<RatingDto> {
  const { data } = await api.post<RatingDto>(
    `${BASE}/sellers/${sellerId}/ratings`,
    body
  );
  return data;
}

export async function editRating(
  sellerId: string,
  id: number,
  body: CreateRatingInput
): Promise<RatingDto> {
  const { data } = await api.patch<RatingDto>(
    `${BASE}/sellers/${sellerId}/ratings/${id}`,
    body
  );
  return data;
}

export async function deleteRating(
  sellerId: string,
  id: number
): Promise<void> {
  await api.delete(`${BASE}/sellers/${sellerId}/ratings/${id}`);
}

export async function getCategories(): Promise<CategoryDto[]> {
  const { data } = await api.get<CategoryDto[]>(`${BASE}/categories`);
  return data;
}

export async function adminToggleCategory(
  code: string,
  enabled: boolean
): Promise<void> {
  await api.patch(`${BASE}/admin/categories/${code}`, { enabled });
}
