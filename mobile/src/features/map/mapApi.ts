import { apiClient } from '@/lib/api';

export interface MapPin {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  isBusinessAccount?: boolean;
  businessName?: string | null;
  bio: string | null;
  lat: number;
  lng: number;
}

export interface PoiPin {
  id: number;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
}

export async function getPins(bairroId: number, filter?: string): Promise<MapPin[]> {
  const { data } = await apiClient.get<MapPin[]>('/api/v1/map/pins', { params: { bairroId, filter } });
  return data;
}

export async function getPois(bairroId: number): Promise<PoiPin[]> {
  const { data } = await apiClient.get<PoiPin[]>('/api/v1/map/pois', { params: { bairroId } });
  return data;
}

export async function updateMapPreference(showOnMap: boolean): Promise<void> {
  await apiClient.put('/api/v1/map/preference', { showOnMap });
}
