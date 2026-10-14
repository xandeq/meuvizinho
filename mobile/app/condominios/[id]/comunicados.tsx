import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAnnouncements } from '../../../src/lib/api/condo';
import type { AnnouncementSummary } from '../../../src/lib/api/condo.types';
import { formatDayMonth } from '../../../src/features/condominium/reservation-slots';
import { EmptyState } from '../../../src/components/EmptyState';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

export default function ComunicadosScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const condoId = Number(id);

  const [items, setItems] = useState<AnnouncementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    getAnnouncements(condoId)
      .then(setItems)
      .catch((e: any) =>
        setError(e?.response?.status === 403 ? 'Só moradores vinculados podem ver os comunicados.' : 'Não foi possível carregar os comunicados.')
      )
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [condoId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(a) => String(a.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={
        error ? (
          <EmptyState icon="lock-closed-outline" title={error} />
        ) : (
          <EmptyState icon="megaphone-outline" title="Nenhum comunicado ainda" subtitle="Os avisos oficiais do síndico aparecem aqui." />
        )
      }
      renderItem={({ item: a }) => (
        <Pressable
          onPress={() => router.push(`/condominios/${condoId}/comunicado/${a.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${a.isPinned ? 'Fixado. ' : ''}${a.isImportant ? 'Importante. ' : ''}${a.title}`}
          style={({ pressed }) => [
            styles.card,
            shadow.ambientLow,
            {
              backgroundColor: colors.card,
              borderColor: a.isImportant ? colors.danger + '55' : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          {(a.isPinned || a.isImportant) && (
            <View style={styles.badges}>
              {a.isPinned && (
                <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="pin" size={11} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>Fixado</Text>
                </View>
              )}
              {a.isImportant && (
                <View style={[styles.badge, { backgroundColor: colors.danger + '15' }]}>
                  <Ionicons name="alert-circle" size={11} color={colors.danger} />
                  <Text style={[styles.badgeText, { color: colors.danger }]}>Importante</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[styles.title, { color: colors.fg }]} numberOfLines={2}>{a.title}</Text>
          <Text style={[styles.preview, { color: colors.mutedFg }]} numberOfLines={3}>{a.bodyPreview}</Text>
          <View style={styles.footer}>
            <Ionicons name="person-circle-outline" size={14} color={colors.mutedFg} />
            <Text style={[styles.meta, { color: colors.mutedFg }]} numberOfLines={1}>
              {a.authorName ?? 'Síndico'}
            </Text>
            {a.authorVerified && <Ionicons name="checkmark-circle" size={13} color={colors.secondary} />}
            <Text style={[styles.meta, { color: colors.mutedFg, marginLeft: 'auto' }]}>{formatDayMonth(a.publishedAt)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 80, gap: 12, flexGrow: 1 },
  card: { borderRadius: radius.md, borderWidth: 1, padding: 14 },
  badges: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  badgeText: { fontFamily: fontFamily.semibold, fontSize: 11 },
  title: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 21 },
  preview: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  meta: { fontFamily: fontFamily.medium, fontSize: 12 },
});
