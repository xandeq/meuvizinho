'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { getPins, getPois, updateMapPreference } from '@/lib/api/map';
import type { MapPin, PointOfInterest, MapFilter } from '@/lib/types/map';

function MapPinAvatar({ photoUrl, displayName }: { photoUrl?: string | null; displayName?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = (displayName?.[0] ?? '?').toUpperCase();
  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={displayName ?? ''}
        className="w-8 h-8 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-fg text-xs">
      {initial}
    </div>
  );
}

// Custom marker icons for resident vs business accounts
function createMarkerIcon(isBusinessAccount?: boolean) {
  const color = isBusinessAccount ? '#D97706' : '#2563EB';
  const svgPath = isBusinessAccount
    ? 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0'
    : 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10';
  const pulseRing = isBusinessAccount
    ? ''
    : '<div class="marker-pulse-ring"></div>';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;overflow:visible;width:32px;height:32px;border-radius:${isBusinessAccount ? '6px' : '50%'};background:${color};display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${pulseRing}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${svgPath}"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Fix webpack-broken default icon paths (MAP-001 pitfall)
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// Vila Velha / ES default center (bairro centroid fallback)
const DEFAULT_CENTER: [number, number] = [-20.3297, -40.2927];
const DEFAULT_ZOOM = 14;

export default function MapClient() {
  const user = useAuthStore((s) => s.user);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [showOnMap, setShowOnMap] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.bairroId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      getPins(user.bairroId, filter === 'all' ? undefined : filter),
      getPois(user.bairroId),
    ])
      .then(([p, poi]) => { setPins(p); setPois(poi); })
      .finally(() => setLoading(false));
  }, [user?.bairroId, filter]);

  const handleToggleVisibility = async () => {
    const next = !showOnMap;
    setShowOnMap(next);
    await updateMapPreference(next);
  };

  return (
    <div className="space-y-3">
      {/* MAP-004 Privacy toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'verified', 'new'] as MapFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm rounded-full border ${filter === f ? 'bg-primary text-white border-primary' : 'bg-card text-muted-fg border-border/50'}`}
            >
              {f === 'all' ? 'Todos' : f === 'verified' ? 'Verificados' : 'Novos'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-fg cursor-pointer">
          <input
            type="checkbox"
            checked={showOnMap}
            onChange={handleToggleVisibility}
            className="accent-primary"
          />
          Aparecer no mapa
        </label>
      </div>

      {/* MAP-001 Interactive map */}
      <div className="relative">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[65vh] w-full rounded-xl border border-border/50"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* MAP-003 User pins with mini-profile popup */}
        <MarkerClusterGroup chunkedLoading>
          {pins.map((pin) => (
            <Marker key={pin.userId} position={[pin.lat, pin.lng]} icon={createMarkerIcon(pin.isBusinessAccount)}>
              <Popup>
                <div className="min-w-[180px] space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPinAvatar photoUrl={pin.photoUrl} displayName={pin.displayName} />
                    <div>
                      <p className="font-medium text-sm text-fg">{pin.displayName ?? 'Vizinho'}</p>
                      {pin.isVerified && (
                        <span className="inline-flex items-center gap-1 bg-secondary text-white text-xs px-2 py-0.5 rounded-full">
                          Verificado
                        </span>
                      )}
                      {pin.isBusinessAccount && (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent/10 text-accent rounded px-1.5 py-0.5 mt-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                            Negócio local
                          </span>
                          <a href={`/business/${pin.userId}/`} className="text-xs text-primary font-semibold mt-1 inline-block">
                            Ver perfil do negócio
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {pin.bio && <p className="text-xs text-muted-fg">{pin.bio}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* MAP-007 POI pins */}
        {pois.map((poi) => (
          <Marker
            key={`poi-${poi.id}`}
            position={[poi.lat, poi.lng]}
            icon={L.divIcon({ className: 'poi-icon', html: `<span title="${poi.category}">📍</span>` })}
          >
            <Popup>
              <p className="font-medium text-sm">{poi.name}</p>
              <p className="text-xs text-muted-fg">{poi.category}</p>
              {poi.description && <p className="text-xs text-muted-fg mt-1">{poi.description}</p>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 bg-bg/90 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 shadow-md">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-fg">Carregando pins...</span>
        </div>
      )}
      </div>
    </div>
  );
}
