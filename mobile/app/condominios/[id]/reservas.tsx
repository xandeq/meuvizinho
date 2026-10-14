import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyReservations, cancelReservation } from '../../../src/lib/api/condo';
import { RESERVATION_STATUS_LABELS, type AreaReservation } from '../../../src/lib/api/condo.types';
import { formatRange } from '../../../src/features/condominium/reservation-slots';
import { EmptyState } from '../../../src/components/EmptyState';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

export default function MinhasReservasScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const condoId = Number(id);

  const [items, setItems] = useState<AreaReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const load = useCallback((showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    getMyReservations(condoId)
      .then(setItems)
      .catch((e: any) =>
        setError(e?.response?.status === 403 ? 'Só moradores vinculados têm reservas.' : 'Não foi possível carregar suas reservas.')
      )
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [condoId]);

  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    const now = Date.now();
    const isActive = (r: AreaReservation) => r.status === 'Pending' || r.status === 'Approved';
    const upcoming = items
      .filter((r) => isActive(r) && new Date(r.startUtc).getTime() > now)
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    const past = items
      .filter((r) => !upcoming.includes(r))
      .sort((a, b) => b.startUtc.localeCompare(a.startUtc));
    return [
      { title: 'Próximas', data: upcoming },
      { title: 'Histórico', data: past },
    ].filter((s) => s.data.length > 0);
  }, [items]);

  const statusColor = (s: AreaReservation['status']) =>
    s === 'Approved' ? colors.secondary : s === 'Pending' ? colors.accent : s === 'Rejected' ? colors.danger : colors.mutedFg;

  const confirmCancel = (r: AreaReservation) => {
    Alert.alert('Cancelar reserva?', `${r.commonAreaName ?? 'Área comum'}\n${formatRange(r.startUtc, r.endUtc)}`, [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: async () => {
          setCancelling(r.id);
          try {
            await cancelReservation(condoId, r.id);
            load();
          } catch (e: any) {
            Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível cancelar.');
          } finally {
            setCancelling(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={
        error ? (
          <EmptyState icon="lock-closed-outline" title={error} />
        ) : (
          <EmptyState
            icon="bookmark-outline"
            title="Você ainda não tem reservas"
            subtitle="Reserve o salão de festas, churrasqueira ou outro espaço do condomínio."
            actionLabel="Ver áreas comuns"
            actionIcon="calendar-outline"
            onAction={() => router.replace(`/condominios/${condoId}/areas`)}
          />
        )
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.section, { color: colors.mutedFg }]}>{section.title}</Text>
      )}
      renderItem={({ item: r }) => {
        const color = statusColor(r.status);
        const canCancel = (r.status === 'Pending' || r.status === 'Approved') && new Date(r.startUtc).getTime() > Date.now();
        return (
          <View style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.area, { color: colors.fg }]} numberOfLines={1}>{r.commonAreaName ?? 'Área comum'}</Text>
              <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                <Text style={[styles.badgeText, { color }]}>{RESERVATION_STATUS_LABELS[r.status]}</Text>
              </View>
            </View>
            <View style={styles.when}>
              <Ionicons name="time-outline" size={14} color={colors.mutedFg} />
              <Text style={[styles.whenText, { color: colors.fg }]}>{formatRange(r.startUtc, r.endUtc)}</Text>
            </View>
            {r.title ? <Text style={[styles.meta, { color: colors.mutedFg }]}>{r.title}{r.guestsCount != null ? ` · ${r.guestsCount} convidados` : ''}</Text> : null}
            {r.status === 'Rejected' && r.reviewNote ? (
              <Text style={[styles.meta, { color: colors.danger }]}>Motivo: {r.reviewNote}</Text>
            ) : null}
            {canCancel && (
              <Pressable
                onPress={() => confirmCancel(r)}
                disabled={cancelling === r.id}
                accessibilityRole="button"
                accessibilityLabel={`Cancelar reserva de ${r.commonAreaName ?? 'área comum'}`}
                hitSlop={6}
                style={({ pressed }) => [styles.cancel, { opacity: pressed || cancelling === r.id ? 0.5 : 1 }]}
              >
                {cancelling === r.id ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                    <Text style={[styles.cancelText, { color: colors.danger }]}>Cancelar</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 80, gap: 12, flexGrow: 1 },
  section: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 },
  card: { borderRadius: radius.md, borderWidth: 1, padding: 14, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  area: { flex: 1, fontFamily: fontFamily.bold, fontSize: 15 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  badgeText: { fontFamily: fontFamily.semibold, fontSize: 11 },
  when: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  whenText: { fontFamily: fontFamily.medium, fontSize: 13 },
  meta: { fontFamily: fontFamily.regular, fontSize: 12 },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4, paddingVertical: 4 },
  cancelText: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
