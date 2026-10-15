import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyIncidents, getAllIncidents } from '../../../src/lib/api/condo';
import { getCondominium } from '../../../src/lib/api/community';
import { INCIDENT_STATUS_LABELS, type IncidentDto } from '../../../src/lib/api/condo.types';
import { categoryMeta, statusTone, relativeDate } from '../../../src/features/condominium/incident-ui';
import { useAuthStore } from '../../../src/lib/auth-store';
import { EmptyState } from '../../../src/components/EmptyState';
import { ListSkeleton } from '../../../src/components/Skeleton';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

type Scope = 'mine' | 'all';

export default function OcorrenciasScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const condoId = Number(id);
  const isAdmin = useAuthStore((s) => !!s.user?.isAdmin);

  const [canManage, setCanManage] = useState(false);
  // null = automático: síndico abre em 'Todas' (antes caía em 'Minhas', vazia).
  const [scopeChoice, setScope] = useState<Scope | null>(null);
  const scope: Scope = scopeChoice ?? (canManage ? 'all' : 'mine');
  const [items, setItems] = useState<IncidentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showRefresh = false) => {
      showRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const condo = await getCondominium(condoId);
        const manage = condo.isMySindico || isAdmin;
        setCanManage(manage);
        const effective: Scope = manage ? scopeChoice ?? 'all' : 'mine';
        setItems(effective === 'all' ? await getAllIncidents(condoId) : await getMyIncidents(condoId));
      } catch (e: any) {
        setError(
          e?.response?.status === 403
            ? 'Só moradores vinculados podem abrir ocorrências.'
            : 'Não foi possível carregar as ocorrências.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [condoId, isAdmin, scopeChoice]
  );

  // Recarrega ao voltar da tela de nova ocorrência ou do detalhe.
  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const counts = useMemo(() => {
    const open = items.filter((i) => i.status === 'Aberta').length;
    const doing = items.filter((i) => i.status === 'EmAndamento').length;
    const closed = items.filter((i) => i.status === 'Resolvida' || i.status === 'Recusada').length;
    return { open, doing, closed };
  }, [items]);

  // Trocar o escopo recria `load`, e o useFocusEffect acima recarrega sozinho.
  const switchScope = (next: Scope) => setScope(next);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ListSkeleton rows={4} />
      </View>
    );
  }

  const header = (
    <View style={styles.headerWrap}>
      {canManage && (
        <View style={[styles.segment, { backgroundColor: colors.muted }]} accessibilityRole="tablist">
          {(['mine', 'all'] as Scope[]).map((s) => {
            const active = scope === s;
            return (
              <Pressable
                key={s}
                onPress={() => switchScope(s)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentBtn, active && [{ backgroundColor: colors.card }, shadow.ambientLow]]}
              >
                <Text style={[styles.segmentText, { color: active ? colors.fg : colors.mutedFg }]}>
                  {s === 'mine' ? 'Minhas' : 'Todas do condomínio'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {items.length > 0 && (
        <View style={styles.stats}>
          {[
            { n: counts.open, label: counts.open === 1 ? 'aberta' : 'abertas', color: colors.accent },
            { n: counts.doing, label: 'em andamento', color: colors.primary },
            { n: counts.closed, label: counts.closed === 1 ? 'encerrada' : 'encerradas', color: colors.mutedFg },
          ].map((s) => (
            <View key={s.label} style={[styles.stat, { backgroundColor: colors.card }]}>
              <Text style={[styles.statN, { color: s.color }]}>{s.n}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedFg }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        data={items}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListEmptyComponent={
          error ? (
            <EmptyState icon="lock-closed-outline" title={error} />
          ) : (
            <EmptyState
              icon="construct-outline"
              title={scope === 'all' ? 'Nenhuma ocorrência no condomínio' : 'Nenhuma ocorrência aberta'}
              subtitle="Lâmpada queimada, vazamento, barulho: avise o síndico por aqui e acompanhe a resposta."
            />
          )
        }
        renderItem={({ item: i }) => {
          const cat = categoryMeta(i.category);
          const tone = colors[statusTone(i.status)];
          return (
            <Pressable
              onPress={() => router.push(`/condominios/${condoId}/ocorrencia/${i.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${i.title}, ${INCIDENT_STATUS_LABELS[i.status]}`}
              style={({ pressed }) => [styles.card, shadow.ambientLow, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.catTile, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={cat.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.fg }]} numberOfLines={2}>{i.title}</Text>
                <Text style={[styles.meta, { color: colors.mutedFg }]} numberOfLines={1}>
                  {cat.label} · {relativeDate(i.createdAt)}
                  {scope === 'all' && i.reporterName ? ` · ${i.reporterName}` : ''}
                </Text>
                <View style={[styles.pill, { backgroundColor: tone + '1A' }]}>
                  <View style={[styles.dot, { backgroundColor: tone }]} />
                  <Text style={[styles.pillText, { color: tone }]}>{INCIDENT_STATUS_LABELS[i.status]}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
            </Pressable>
          );
        }}
      />
      {!error && (
        <Pressable
          onPress={() => router.push(`/condominios/${condoId}/ocorrencia/nova`)}
          accessibilityRole="button"
          accessibilityLabel="Abrir nova ocorrência"
          style={({ pressed }) => [
            styles.fab,
            shadow.blue,
            { backgroundColor: colors.primaryFill, bottom: 24 + insets.bottom, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>Nova ocorrência</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, flexGrow: 1 },
  headerWrap: { gap: 12, marginBottom: 4 },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segmentBtn: { flex: 1, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  statN: { fontFamily: fontFamily.extrabold, fontSize: 22 },
  statLabel: { fontFamily: fontFamily.medium, fontSize: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  catTile: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.xl },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  fab: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 20, borderRadius: 26 },
  fabText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 15 },
});
