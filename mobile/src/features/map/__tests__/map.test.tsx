/**
 * map.test.tsx
 *
 * Verifies:
 *  - useMapStore: filter, showOnMap, setPins, setPois state management
 *  - mapApi: getPins, getPois, updateMapPreference call correct endpoints
 *  - Map screen file exists with required testIDs and constraints
 */

// ---------------------------------------------------------------------------
// Mock expo-constants (used by api.ts)
// ---------------------------------------------------------------------------
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiUrl: 'https://api.example.com' } } },
}));

// Mock AsyncStorage (used by auth-store)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  clear: jest.fn().mockResolvedValue(undefined),
  mergeItem: jest.fn().mockResolvedValue(undefined),
  multiMerge: jest.fn().mockResolvedValue(undefined),
  flushGetRequests: jest.fn(),
}));

// Mock shared-api-client
jest.mock('@bairronow/shared-api-client', () => ({
  createApiClient: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  }),
  createAuthApi: () => ({}),
  createCepApi: () => ({}),
  createVerificationApi: () => ({}),
  createProfileApi: () => ({}),
}));

import { useMapStore } from '../useMapStore';
import * as mapApi from '../mapApi';

// ---------------------------------------------------------------------------
// Map Store tests
// ---------------------------------------------------------------------------
describe('useMapStore', () => {
  beforeEach(() => {
    useMapStore.setState({
      pins: [],
      pois: [],
      filter: 'all',
      showOnMap: true,
    });
  });

  it('initial filter is "all"', () => {
    expect(useMapStore.getState().filter).toBe('all');
  });

  it('initial showOnMap is true', () => {
    expect(useMapStore.getState().showOnMap).toBe(true);
  });

  it('setFilter updates filter', () => {
    useMapStore.getState().setFilter('verified');
    expect(useMapStore.getState().filter).toBe('verified');
  });

  it('setShowOnMap updates showOnMap', () => {
    useMapStore.getState().setShowOnMap(false);
    expect(useMapStore.getState().showOnMap).toBe(false);
  });

  it('setPins stores pins array', () => {
    const pins = [
      { userId: 'u1', displayName: 'João', isVerified: true, bio: 'Bio', lat: -20.3, lng: -40.2, photoUrl: null },
    ];
    useMapStore.getState().setPins(pins);
    expect(useMapStore.getState().pins).toHaveLength(1);
    expect(useMapStore.getState().pins[0].displayName).toBe('João');
  });

  it('setPois stores pois array', () => {
    const pois = [{ id: 1, name: 'Praça Central', description: null, category: 'Praça', lat: -20.3, lng: -40.2 }];
    useMapStore.getState().setPois(pois);
    expect(useMapStore.getState().pois).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Map API tests
// ---------------------------------------------------------------------------
describe('mapApi — endpoint coverage', () => {
  // We verify the API client is called with correct paths and params.
  // The apiClient mock comes from shared-api-client mock above via api.ts.

  it('getPins calls /api/v1/map/pins with bairroId and filter', async () => {
    // Import api.ts to get the mocked apiClient
    const { apiClient } = require('@/lib/api');
    const mockData = [
      { userId: 'u1', displayName: 'Maria', isVerified: true, bio: null, lat: -20.33, lng: -40.29, photoUrl: null },
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockData });

    const result = await mapApi.getPins(42, 'verified');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/map/pins', { params: { bairroId: 42, filter: 'verified' } });
    expect(result).toEqual(mockData);
  });

  it('getPins without filter passes undefined', async () => {
    const { apiClient } = require('@/lib/api');
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    await mapApi.getPins(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/map/pins', { params: { bairroId: 1, filter: undefined } });
  });

  it('getPois calls /api/v1/map/pois with bairroId', async () => {
    const { apiClient } = require('@/lib/api');
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    await mapApi.getPois(5);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/map/pois', { params: { bairroId: 5 } });
  });

  it('updateMapPreference calls PUT /api/v1/map/preference', async () => {
    const { apiClient } = require('@/lib/api');
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: undefined });

    await mapApi.updateMapPreference(false);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/map/preference', { showOnMap: false });
  });
});

// ---------------------------------------------------------------------------
// Static analysis: verify screen file constraints
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';

describe('map.tsx — static constraints', () => {
  const screenPath = path.resolve(__dirname, '../../../..', 'app/(tabs)/map.tsx');
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(screenPath, 'utf-8');
  });

  it('has show-on-map-switch testID (required for E2E)', () => {
    expect(src).toContain('testID="show-on-map-switch"');
  });

  it('has geolocationEnabled={false} — MAP-002 no real GPS', () => {
    expect(src).toContain('geolocationEnabled={false}');
  });

  it('does not use react-native-maps (needs a Google Maps key on Android, crashed the Map tab)', () => {
    expect(src).not.toContain('react-native-maps');
  });

  it('calls getPins with filter when filter changes', () => {
    expect(src).toContain('getPins(');
  });

  it('calls updateMapPreference on toggle', () => {
    expect(src).toContain('updateMapPreference(');
  });
});
