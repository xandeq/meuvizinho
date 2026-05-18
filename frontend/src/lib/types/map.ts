export interface MapPin {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  isBusinessAccount?: boolean;
  bio: string | null;
  lat: number;
  lng: number;
}

export interface PointOfInterest {
  id: number;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
}

export interface HeatmapCell {
  latCell: number;
  lngCell: number;
  count: number;
}

export type MapFilter = 'all' | 'verified' | 'new';
