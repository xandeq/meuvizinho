import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/lib/auth-store';
import { getSecurityAlerts, upvoteSecurityAlert } from '../../src/lib/api/community';
import { SECURITY_ALERT_KIND_LABELS, type SecurityAlertKind, type SecurityAlertSummary } from '../../src/lib/api/community.types';
import { EmptyState } from '../../src/components/EmptyState';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../src/theme/tokens';
import { ListSkeleton } from '../../src/components/Skeleton';
import { VerificationGate } from '../../src/components/VerificationGate';
import { FadeInView, usePop } from '../../src/lib/motion';

const KIND_FILTERS: { code: SecurityAlertKind | ''; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { code: '', label: 'Todos', icon: 'apps-outline' },
  { code: 'Furto', label: 'Furto', icon: 'lock-open-outline' },
  { code: 'Suspeito', label: 'Suspeito', icon: 'eye-outline' },
  { code: 'Incendio', label: 'Incêndio', icon: 'flame-outline' },
  { code: 'Acidente', label: 'Acidente', icon: 'car-outline' },
  { code: 'Outros', label: 'Outros', icon: 'alert-circle-outline' },
];

const KIND_ICON: Record<SecurityAlertKind, keyof typeof Ionicons.glyphMap> = {
  Furto: 'lock-open',
  Suspeito: 'eye',
  Incendio: 'flame',
  Acidente: 'car',
  Outros: 'alert-circle',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export default function AlertasScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isVerified = !!user?.isVerified;
  const bairroId = user?.bairroId ?? 0;

  const [alerts, setAlerts] = useState<SecurityAlertSummary[]>([]);
  const [kind, setKind] = useState<SecurityAlertKind | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upvoting, setUpvoting] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = (showRefresh = false) => {
    if (!bairroId) {
      setLoading(false);
      return;
    }
    showRefresh ? setRefreshing(true) : setLoading(true);
    setLoadError(false);
    // Sem catch, uma falha aparecia como "Nenhum alerta no seu bairro — Que bom!" num recurso de segurança.
    getSecurityAlerts(bairroId, { kind: kind || undefined })
      .then(setAlerts)
      .catch(() => setLoadError(true))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  // Ao voltar de "novo alerta" a lista não recarregava e o alerta recém-criado não aparecia.
  useFocusEffect(useCallback(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [bairroId, kind]));

  const handleUpvote = async (a: SecurityAlertSummary) => {
    setUpvoting(a.id);
    try {
      const { upvoteCount } = await upvoteSecurityAlert(a.id);
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, upvoteCount, upvotedByMe: true } : x)));
    } catch {
      // silencioso — upvote é melhoria incremental, não crítico pro fluxo
    } finally {
      setUpvoting(null);
    }
  };

  if (!bairroId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <VerificationGate what="os alertas do seu bairro" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={KIND_FILTERS}
        keyExtractor={(f) => f.code}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => {
          const active = kind === item.code;
          return (
            <Pressable accessibilityRole="button"
              onPress={() => setKind(item.code)}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: active ? colors.dangerFill : colors.card },
              ]}
            >
              <Ionicons name={item.icon} size={14} color={active ? '#fff' : colors.mutedFg} style={{ marginRight: 5 }} />
              <Text style={[styles.chipText, { color: active ? '#fff' : colors.fg }]}>{item.label}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={alerts}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 104, gap: 12, flexGrow: 1 }} // espaço p/ o botão Reportar não cobrir o último alerta
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.danger} />}
        ListEmptyComponent={
          loading ? (
            <ListSkeleton rows={4} />
          ) : loadError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Não foi possível carregar os alertas"
              subtitle="Verifique sua conexão e tente de novo."
              actionLabel="Tentar de novo"
              actionIcon="refresh"
              onAction={() => load()}
            />
          ) : (
            <EmptyState
              icon="shield-checkmark-outline"
              title="Nenhum alerta no seu bairro"
              subtitle="Que bom! Avise seus vizinhos se notar algo fora do comum."
            />
          )
        }
        renderItem={({ item, index }) => (
          <AlertCard item={item} index={index} busy={upvoting === item.id} onUpvote={() => handleUpvote(item)} />
        )}
      />

      {isVerified && (
        <Pressable accessibilityRole="button"
          style={[styles.fab, shadow.ambientHigh, { backgroundColor: colors.dangerFill, bottom: 24 + insets.bottom }]}
          onPress={() => router.push('/alertas/new')}
        >
          <Ionicons name="add" size={22} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.fabText}>Reportar</Text>
        </Pressable>
      )}
    </View>
  );
}

function AlertCard({ item, index, busy, onUpvote }: { item: SecurityAlertSummary; index: number; busy: boolean; onUpvote: () => void }) {
  const { colors } = useTheme();
  const { scale, pop } = usePop();
  const confirmed = !!item.upvotedByMe;
  return (
    <FadeInView delay={index < 6 ? index * 50 : 0}>
      <View style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.lg }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.kindBadge, { backgroundColor: colors.danger + '18' }]}>
            <Ionicons name={KIND_ICON[item.kind]} size={16} color={colors.danger} />
            <Text style={[styles.kindText, { color: colors.danger }]}>{SECURITY_ALERT_KIND_LABELS[item.kind]}</Text>
          </View>
          <Text style={[styles.time, { color: colors.mutedFg }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={[styles.description, { color: colors.fg }]}>{item.description}</Text>
        {item.locationDescription && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.mutedFg} />
            <Text style={[styles.location, { color: colors.mutedFg }]}>{item.locationDescription}</Text>
          </View>
        )}
        <Pressable accessibilityRole="button"
          onPress={() => { pop(); onUpvote(); }}
          disabled={busy || confirmed}
          accessibilityState={{ selected: confirmed, disabled: busy || confirmed }}
          // Confirmado vira pílula preenchida: dá para ver de longe o que você já confirmou.
          style={[styles.upvoteBtn, { borderColor: confirmed ? colors.primary : colors.border, backgroundColor: confirmed ? colors.primaryLight : 'transparent' }]}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name={confirmed ? 'checkmark-circle' : 'arrow-up-circle-outline'} size={16} color={confirmed ? colors.primary : colors.mutedFg} />
          </Animated.View>
          <Text style={[styles.upvoteText, { color: confirmed ? colors.primary : colors.mutedFg }]}>
            {item.upvoteCount > 0 ? `${item.upvoteCount} ${item.upvoteCount === 1 ? 'confirmou' : 'confirmaram'}` : 'Confirmar'}
          </Text>
        </Pressable>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { maxHeight: 48, marginTop: 12, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  card: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kindBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.xl },
  kindText: { fontFamily: fontFamily.bold, fontSize: 12 },
  time: { fontFamily: fontFamily.regular, fontSize: 12 },
  description: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  location: { fontFamily: fontFamily.regular, fontSize: 12 },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  upvoteText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    bottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  fabText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 14 },
});
