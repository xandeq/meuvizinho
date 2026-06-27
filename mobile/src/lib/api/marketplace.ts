import { apiClient } from '../api';
import type {
  ListingDto,
  ListingPageResult,
  CreateListingRequest,
  UpdateListingRequest,
  CategoryDto,
  RatingDto,
  SellerRatingsResponse,
  CreateRatingRequest,
  ReportListingReason,
  ListingPhotoAsset,
} from './marketplace.types';

export interface ListListingsParams {
  bairroId: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  sort?: string;
  cursor?: string;
  take?: number;
}

function appendListingPhotosToFormData(form: FormData, photos: ListingPhotoAsset[]) {
  photos.forEach((p, idx) => {
    // React Native multipart shape: { uri, name, type } cast as any for FormData
    form.append('photos', {
      uri: p.uri,
      name: p.name || `listing-${idx}.jpg`,
      type: p.type || 'image/jpeg',
    } as unknown as Blob);
  });
}

export const marketplaceApi = {
  list: async (params: ListListingsParams): Promise<ListingPageResult> => {
    const { data } = await apiClient.get<ListingPageResult>('/api/v1/listings', {
      params: {
        bairroId: params.bairroId,
        category: params.category,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        verifiedOnly: params.verifiedOnly ?? true,
        sort: params.sort,
        cursor: params.cursor,
        take: params.take ?? 20,
      },
    });
    return data;
  },

  search: async (
    bairroId: number,
    q: string,
    params: Omit<ListListingsParams, 'bairroId' | 'cursor' | 'take' | 'sort'> = {}
  ): Promise<ListingPageResult> => {
    const { data } = await apiClient.get<ListingPageResult>('/api/v1/listings/search', {
      params: {
        bairroId,
        q,
        category: params.category,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        verifiedOnly: params.verifiedOnly ?? true,
      },
    });
    return data;
  },

  get: async (id: number): Promise<ListingDto> => {
    const { data } = await apiClient.get<ListingDto>(`/api/v1/listings/${id}`);
    return data;
  },

  create: async (
    body: CreateListingRequest,
    photos: ListingPhotoAsset[]
  ): Promise<ListingDto> => {
    const form = new FormData();
    form.append('data', JSON.stringify(body));
    appendListingPhotosToFormData(form, photos);
    const { data } = await apiClient.post<ListingDto>('/api/v1/listings', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async (id: number, body: UpdateListingRequest): Promise<ListingDto> => {
    const { data } = await apiClient.patch<ListingDto>(`/api/v1/listings/${id}`, body);
    return data;
  },

  markSold: async (id: number): Promise<ListingDto> => {
    const { data } = await apiClient.post<ListingDto>(`/api/v1/listings/${id}/mark-sold`, {});
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/listings/${id}`);
  },

  toggleFavorite: async (id: number): Promise<{ favorited: boolean }> => {
    const { data } = await apiClient.post<{ favorited: boolean }>(
      `/api/v1/listings/${id}/favorite`,
      {}
    );
    return data;
  },

  report: async (
    id: number,
    reason: ReportListingReason,
    note?: string
  ): Promise<void> => {
    await apiClient.post(`/api/v1/listings/${id}/report`, { reason, note });
  },

  // Categories
  listCategories: async (): Promise<CategoryDto[]> => {
    const { data } = await apiClient.get<CategoryDto[]>('/api/v1/categories');
    return data;
  },

  // Ratings
  getSellerRatings: async (sellerId: string): Promise<SellerRatingsResponse> => {
    const { data } = await apiClient.get<SellerRatingsResponse>(
      `/api/v1/sellers/${sellerId}/ratings`
    );
    return data;
  },

  createRating: async (
    sellerId: string,
    body: CreateRatingRequest
  ): Promise<RatingDto> => {
    const { data } = await apiClient.post<RatingDto>(
      `/api/v1/sellers/${sellerId}/ratings`,
      body
    );
    return data;
  },

  updateRating: async (
    sellerId: string,
    id: number,
    body: { stars?: number; comment?: string }
  ): Promise<RatingDto> => {
    const { data } = await apiClient.patch<RatingDto>(
      `/api/v1/sellers/${sellerId}/ratings/${id}`,
      body
    );
    return data;
  },
};
