import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuthStore } from '../../src/lib/auth-store';
import { useMapStore } from '../../src/features/map/useMapStore';
import { getPins, getPois, updateMapPreference } from '../../src/features/map/mapApi';
import { buildLeafletHtml, type LeafletPin } from '../../src/features/map/leafletHtml';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily } from '../../src/theme/tokens';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useBairroName } from '../../src/lib/useBairroName';
import { useRouter } from 'expo-router';
import { goBackOr } from '../../src/lib/navigation';

// Same default center/zoom as the web map (Vila Velha / ES).
const DEFAULT_CENTER = { lat: -20.3297, lng: -40.2927, zoom: 15 };

const FILTER_OPTIONS: Array<{ label: string; value: 'all' | 'verified' | 'new' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Verificados', value: 'verified' },
  { label: 'Novos', value: 'new' },
];

export default function MapScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const bairroName = useBairroName();
  const { pins, pois, filter, showOnMap, setPins, setPois, setFilter, setShowOnMap } = useMapStore();
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const loadPins = useCallback(() => {
    // Sem bairro (não verificado ou sessão caiu) o overlay girava para sempre:
    // loading nasce true e este retorno antecipado nunca o desligava.
    if (!user?.bairroId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getPins(user.bairroId, filter === 'all' ? undefined : filter),
      getPois(user.bairroId),
    ])
      .then(([p, poi]) => { setPins(p); setPois(poi); })
      .finally(() => setLoading(false));
  }, [user?.bairroId, filter]);

  useEffect(() => { loadPins(); }, [loadPins]);

  const handleToggleMap = async (value: boolean) => {
    setShowOnMap(value);
    try {
      await updateMapPreference(value);
    } catch {
      setShowOnMap(!value);
    }
  };

  // HTML is built once; markers are pushed in afterwards so the map never reloads.
  const html = useMemo(
    () => buildLeafletHtml({ ...DEFAULT_CENTER, bg: colors.bg }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const markers: LeafletPin[] = useMemo(() => [
    ...pins.map((pin) => ({
      id: pin.userId,
      lat: pin.lat,
      lng: pin.lng,
      title: pin.displayName ?? 'Vizinho',
      subtitle: pin.isVerified ? 'Verificado' : pin.bio ?? null,
      color: pin.isVerified ? colors.secondary : colors.mutedFg,
    })),
    ...pois.map((poi) => ({
      id: `poi-${poi.id}`,
      lat: poi.lat,
      lng: poi.lng,
      title: poi.name,
      subtitle: poi.category,
      color: colors.primary,
    })),
  ], [pins, pois, colors.secondary, colors.mutedFg, colors.primary]);

  useEffect(() => {
    if (!mapReady) return;
    webViewRef.current?.injectJavaScript(
      `window.__setMarkers(${JSON.stringify(markers)}); true;`,
    );
  }, [mapReady, markers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader onBack={() => goBackOr(router, '/(tabs)/feed')} title="Mapa" place={bairroName} />
      <View style={[styles.controls, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_OPTIONS.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              onPress={() => setFilter(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              style={[
                styles.filterBtn,
                { borderColor: colors.border },
                filter === value && { backgroundColor: colors.primaryFill, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.filterText, { color: colors.mutedFg }, filter === value && { color: '#fff' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.fg }]}>Aparecer no mapa</Text>
          <Switch
            testID="show-on-map-switch"
            value={showOnMap}
            onValueChange={handleToggleMap}
            trackColor={{ true: colors.primaryFill, false: colors.border }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Aparecer no mapa para vizinhos"
          />
        </View>
      </View>

      {/* MAP-002: no real GPS — geolocation stays disabled in the WebView. */}
      <WebView
        ref={webViewRef}
        testID="map-webview"
        style={styles.map}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://meuvizinhoapp.com.br' }}
        geolocationEnabled={false}
        javaScriptEnabled
        domStorageEnabled={false}
        setSupportMultipleWindows={false}
        onMessage={(e) => { if (e.nativeEvent.data === 'ready') setMapReady(true); }}
      />

      {!loading && pins.length === 0 ? (
        // Mapa vazio sem explicação parecia defeito.
        <View style={[styles.emptyNote, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLiveRegion="polite">
          <Text style={[styles.emptyText, { color: colors.fg }]}>
            {filter === 'all' ? 'Nenhum vizinho visível no mapa ainda.' : 'Ninguém com esse filtro no mapa.'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedFg }]}>A posição é aproximada; o endereço exato nunca aparece.</Text>
        </View>
      ) : null}

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.bg + 'B3' }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { borderBottomWidth: 1, paddingVertical: 8 },
  filterRow: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterBtn: { height: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  filterText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  toggleLabel: { fontFamily: fontFamily.medium, fontSize: 14 },
  map: { flex: 1, width: '100%' },
  emptyNote: { position: 'absolute', left: 16, right: 16, bottom: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  emptyText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
});
