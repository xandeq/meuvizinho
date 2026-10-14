import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCommonAreas } from '../../../src/lib/api/condo';
import type { CommonAreaSummary } from '../../../src/lib/api/condo.types';
import { EmptyState } from '../../../src/components/EmptyState';
import { ListSkeleton } from '../../../src/components/Skeleton';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export default function AreasComunsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const condoId = Number(id);

  const [areas, setAreas] = useState<CommonAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    getCommonAreas(condoId)
      .then((list) => setAreas(list.filter((a) => a.isActive)))
      .catch((e: any) =>
        setError(e?.response?.status === 403 ? 'Só moradores vinculados podem reservar áreas comuns.' : 'Não foi possível carregar as áreas comuns.')
      )
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [condoId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ListSkeleton rows={4} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={areas}
      keyExtractor={(a) => String(a.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={
        error ? (
          <EmptyState icon="lock-closed-outline" title={error} />
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="Nenhuma área cadastrada"
            subtitle="Quando o síndico cadastrar o salão de festas, churrasqueira e outros espaços, eles aparecem aqui."
          />
        )
      }
      renderItem={({ item: a }) => {
        const open = hhmm(a.openTime);
        const close = hhmm(a.closeTime);
        return (
          <Pressable
            onPress={() => router.push(`/condominios/${condoId}/area/${a.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Reservar ${a.name}`}
            style={({ pressed }) => [
              styles.card,
              shadow.ambientLow,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {a.coverImageUrl ? (
              <Image source={{ uri: a.coverImageUrl }} style={styles.cover} resizeMode="cover" accessibilityIgnoresInvertColors />
            ) : null}
            <View style={styles.body}>
              <View style={styles.titleRow}>
                {!a.coverImageUrl && (
                  <View style={[styles.icon, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="business-outline" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.fg }]} numberOfLines={1}>{a.name}</Text>
                  {a.description ? (
                    <Text style={[styles.desc, { color: colors.mutedFg }]} numberOfLines={2}>{a.description}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
              </View>
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: (a.requiresApproval ? colors.accent : colors.primary) + '15' }]}>
                  <Ionicons
                    name={a.requiresApproval ? 'hourglass-outline' : 'flash-outline'}
                    size={11}
                    color={a.requiresApproval ? colors.accent : colors.primary}
                  />
                  <Text style={[styles.chipText, { color: a.requiresApproval ? colors.accent : colors.primary }]}>
                    {a.requiresApproval ? 'Com aprovação do síndico' : 'Confirmação imediata'}
                  </Text>
                </View>
                {a.capacity != null && (
                  <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                    <Ionicons name="people-outline" size={11} color={colors.mutedFg} />
                    <Text style={[styles.chipText, { color: colors.mutedFg }]}>Até {a.capacity}</Text>
                  </View>
                )}
                {(open || close) && (
                  <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                    <Ionicons name="time-outline" size={11} color={colors.mutedFg} />
                    <Text style={[styles.chipText, { color: colors.mutedFg }]}>{open ?? '00:00'}–{close ?? '24:00'}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 80, gap: 12, flexGrow: 1 },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  cover: { width: '100%', height: 120 },
  body: { padding: 14, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fontFamily.bold, fontSize: 16 },
  desc: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.lg },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 11 },
});
