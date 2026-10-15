import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock leaflet to avoid window/DOM errors
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({})),
  icon: jest.fn(),
  latLngBounds: jest.fn(() => ({})),
}));

// leaflet CSS is handled by the global stylesMock via moduleNameMapper

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // FitToPins enquadra o mapa nos vizinhos.
  useMap: () => ({ fitBounds: jest.fn() }),
}));

// Mock react-leaflet-cluster
jest.mock('react-leaflet-cluster', () => {
  const MockCluster = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  MockCluster.displayName = 'MarkerClusterGroup';
  return {
    __esModule: true,
    default: MockCluster,
  };
});

// Mock map API
jest.mock('@/lib/api/map', () => ({
  getPins: jest.fn().mockResolvedValue([]),
  getPois: jest.fn().mockResolvedValue([]),
  getHeatmap: jest.fn().mockResolvedValue([]),
  updateMapPreference: jest.fn().mockResolvedValue(undefined),
}));

// Mock auth store
jest.mock('@/lib/auth', () => ({
  useAuthStore: (selector: (s: { user: { bairroId: number } | null }) => unknown) =>
    selector({ user: { bairroId: 1 } }),
}));

import MapClient from '../MapClient';
import { getPins, updateMapPreference } from '@/lib/api/map';

describe('MapClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPins as jest.Mock).mockResolvedValue([]);
  });

  it('renders without throwing', async () => {
    render(<MapClient />);
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  it('calls updateMapPreference with showOnMap: false when toggled off', async () => {
    render(<MapClient />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(updateMapPreference).toHaveBeenCalledWith(false);
    });
  });

  it('shows Verificado badge on verified pin popup', async () => {
    (getPins as jest.Mock).mockResolvedValue([
      {
        userId: 'u1',
        displayName: 'João Silva',
        photoUrl: null,
        isVerified: true,
        bio: 'Morador há 10 anos',
        lat: -20.33,
        lng: -40.29,
      },
    ]);
    render(<MapClient />);
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Verificado')).toBeInTheDocument();
    });
  });

  it('renders filter buttons Verificados, Novos, Todos', () => {
    render(<MapClient />);
    expect(screen.getByText('Verificados')).toBeInTheDocument();
    expect(screen.getByText('Novos')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
  });
});
