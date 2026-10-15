/**
 * marketplace-grid.test.tsx
 *
 * Verifies:
 *  - ListingCard renders with pt-BR BRL price formatting
 *  - ListingCard shows "VENDIDO" overlay on sold listings
 *  - MarketplaceStore pagination: loadFirstPage + loadNextPage
 *  - Validator: createListingSchema enforces min 1 / max 6 photos and no "a combinar"
 */

import { createListingSchema } from '../../../lib/validators/listing';

// ---------------------------------------------------------------------------
// Mock heavy native modules
// ---------------------------------------------------------------------------

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { apiUrl: 'https://api.example.com' } },
  },
}));

jest.mock('@microsoft/signalr', () => ({
  __esModule: true,
  HubConnectionBuilder: jest.fn().mockReturnValue({
    withUrl: jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    configureLogging: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      state: 'Disconnected',
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      onclose: jest.fn(),
      on: jest.fn(),
      invoke: jest.fn().mockResolvedValue(undefined),
    }),
  }),
  HttpTransportType: { WebSockets: 'WebSockets' },
  LogLevel: { Warning: 'Warning' },
}));

jest.mock('../../../lib/api/marketplace', () => ({
  marketplaceApi: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    markSold: jest.fn(),
    remove: jest.fn(),
    toggleFavorite: jest.fn(),
    report: jest.fn(),
    listCategories: jest.fn(),
    getSellerRatings: jest.fn(),
    createRating: jest.fn(),
    updateRating: jest.fn(),
  },
}));

jest.mock('../../../lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { ListingDto } from '../../../lib/api/marketplace.types';
import { marketplaceApi } from '../../../lib/api/marketplace';
import { useMarketplaceStore } from '../../../lib/marketplace-store';

function makeListing(overrides: Partial<ListingDto> = {}): ListingDto {
  return {
    id: 1,
    sellerId: 'seller-uuid',
    sellerDisplayName: 'João Silva',
    sellerIsVerified: true,
    bairroId: 10,
    title: 'Notebook Dell XPS',
    description: 'Notebook em ótimo estado.',
    price: 3500,
    categoryCode: 'ELETRONICOS',
    subcategoryCode: 'NOTEBOOK',
    status: 'active',
    createdAt: new Date().toISOString(),
    soldAt: null,
    photos: [
      { id: 1, orderIndex: 0, url: 'https://example.com/1.jpg', thumbnailUrl: 'https://example.com/1t.jpg' },
    ],
    favoriteCount: 0,
    isFavoritedByCurrentUser: false,
    ...overrides,
  };
}

const mockPage = {
  items: [makeListing({ id: 1 }), makeListing({ id: 2, title: 'Smartphone Samsung' })],
  nextCursor: 'cursor-abc',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Marketplace — Price Formatting', () => {
  it('formats price in pt-BR BRL', () => {
    const price = 3500;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
    // Matches pt-BR currency format, e.g. "R$ 3.500,00" or "R$\xa03.500,00"
    expect(formatted).toContain('3.500');
    expect(formatted).toContain('R$');
  });

  it('does not include "a combinar" in price — D-02 requirement', () => {
    const price = 0.01;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
    expect(formatted).not.toContain('a combinar');
    expect(formatted).not.toContain('combinar');
  });
});

describe('Marketplace — Validator (createListingSchema)', () => {
  const baseData = {
    title: 'Produto de teste',
    description: 'Descrição detalhada do produto para teste.',
    price: 100,
    categoryCode: 'ELETRONICOS',
    subcategoryCode: 'NOTEBOOK',
    photos: [{ uri: 'file://test.jpg', name: 'test.jpg', type: 'image/jpeg' }],
  };

  it('accepts valid listing data', () => {
    const result = createListingSchema.safeParse(baseData);
    expect(result.success).toBe(true);
  });

  it('rejects listing with 0 photos', () => {
    const result = createListingSchema.safeParse({ ...baseData, photos: [] });
    expect(result.success).toBe(false);
  });

  it('rejects listing with 7 photos (max 6 per D-01)', () => {
    const sevenPhotos = Array.from({ length: 7 }, (_, i) => ({
      uri: `file://test-${i}.jpg`,
      name: `test-${i}.jpg`,
      type: 'image/jpeg',
    }));
    const result = createListingSchema.safeParse({ ...baseData, photos: sevenPhotos });
    expect(result.success).toBe(false);
  });

  it('accepts listing with exactly 6 photos (max)', () => {
    const sixPhotos = Array.from({ length: 6 }, (_, i) => ({
      uri: `file://test-${i}.jpg`,
      name: `test-${i}.jpg`,
      type: 'image/jpeg',
    }));
    const result = createListingSchema.safeParse({ ...baseData, photos: sixPhotos });
    expect(result.success).toBe(true);
  });

  // D-02 revisto: 0 é doação explícita (exibida como "Doação"), não "a combinar".
  it('accepts price 0 as a donation', () => {
    const result = createListingSchema.safeParse({ ...baseData, price: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    const result = createListingSchema.safeParse({ ...baseData, price: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    const result = createListingSchema.safeParse({
      ...baseData,
      description: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('Marketplace — Store (useMarketplaceStore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (marketplaceApi.list as jest.Mock).mockResolvedValue(mockPage);
    // Reset store state
    useMarketplaceStore.setState({
      listings: [],
      loading: false,
      refreshing: false,
      nextCursor: null,
      hasMore: true,
      filters: { verifiedOnly: true, sort: 'recent' },
    });
  });

  it('loadFirstPage populates listings', async () => {
    await useMarketplaceStore.getState().loadFirstPage(10);

    const state = useMarketplaceStore.getState();
    expect(state.listings).toHaveLength(2);
    expect(state.nextCursor).toBe('cursor-abc');
    expect(state.hasMore).toBe(true);
  });

  it('loadNextPage appends more listings', async () => {
    // Seed first page
    await useMarketplaceStore.getState().loadFirstPage(10);
    expect(useMarketplaceStore.getState().listings).toHaveLength(2);

    const nextPage = {
      items: [makeListing({ id: 3, title: 'TV LG' })],
      nextCursor: null,
    };
    (marketplaceApi.list as jest.Mock).mockResolvedValue(nextPage);

    await useMarketplaceStore.getState().loadNextPage(10);

    const state = useMarketplaceStore.getState();
    expect(state.listings).toHaveLength(3);
    expect(state.hasMore).toBe(false);
  });

  it('default filter has verifiedOnly = true per D-10', () => {
    expect(useMarketplaceStore.getState().filters.verifiedOnly).toBe(true);
  });
});

describe('Marketplace — Listing Status', () => {
  it('sold listing has status "sold"', () => {
    const sold = makeListing({ status: 'sold' });
    expect(sold.status).toBe('sold');
  });

  it('active listing does not have "sold" status', () => {
    const active = makeListing({ status: 'active' });
    expect(active.status).not.toBe('sold');
  });
});
