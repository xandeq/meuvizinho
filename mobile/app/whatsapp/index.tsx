import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/lib/auth-store';
import { getWhatsAppGroups, clickWhatsAppGroup } from '../../src/lib/api/community';
import { WHATSAPP_KIND_LABELS, type WhatsAppGroupKind, type WhatsAppGroupSummary } from '../../src/lib/api/community.types';
import { EmptyState } from '../../src/components/EmptyState';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../src/theme/tokens';
import { ListSkeleton } from '../../src/components/Skeleton';
import { VerificationGate } from '../../src/components/VerificationGate';

const KIND_FILTERS: { code: WhatsAppGroupKind | ''; label: string }[] = [
  { code: '', label: 'Todos' },
  { code: 'Predio', label: 'Prédio' },
  { code: 'Condominio', label: 'Condomínio' },
  { code: 'Rua', label: 'Rua' },
  { code: 'Bairro', label: 'Bairro' },
  { code: 'Comercio', label: 'Comércio' },
  { code: 'Interesse', label: 'Interesse' },
];

export default function WhatsAppGroupsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isVerified = !!user?.isVerified;
  const bairroId = user?.bairroId ?? 0;

  const [groups, setGroups] = useState<WhatsAppGroupSummary[]>([]);
  const [kind, setKind] = useState<WhatsAppGroupKind | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (showRefresh = false) => {
    if (!bairroId) {
      setLoading(false);
      return;
    }
    showRefresh ? setRefreshing(true) : setLoading(true);
    getWhatsAppGroups(bairroId, { kind: kind || undefined })
      .then(setGroups)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, [bairroId, kind]);

  const handleOpen = async (g: WhatsAppGroupSummary) => {
    try {
      const { inviteUrl } = await clickWhatsAppGroup(g.id);
      Linking.openURL(inviteUrl);
    } catch {
      Linking.openURL(`https://wa.me/`);
    }
  };

  if (!bairroId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <VerificationGate what="os grupos de WhatsApp do seu bairro" />
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
            <Pressable
              onPress={() => setKind(item.code)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, { borderColor: active ? colors.primaryFill : colors.border, backgroundColor: active ? colors.primaryFill : colors.card }]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : colors.fg }]}>{item.label}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={groups}
        keyExtractor={(g) => String(g.id)}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ListSkeleton rows={4} />
          ) : (
            <EmptyState
              icon="logo-whatsapp"
              title="Nenhum grupo de WhatsApp ainda"
              subtitle='Toque em "Indicar grupo" e compartilhe o grupo do seu prédio, rua ou condomínio.'
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button"
            onPress={() => handleOpen(item)}
            style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.lg }]}
          >
            <View style={[styles.waIcon, { backgroundColor: '#25D3661F' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.name, { color: colors.fg }]} numberOfLines={1}>{item.name}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.kindBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.kindText, { color: colors.mutedFg }]}>{WHATSAPP_KIND_LABELS[item.kind]}</Text>
                </View>
                {item.memberCountApprox != null && (
                  <Text style={[styles.members, { color: colors.mutedFg }]}>~{item.memberCountApprox} membros</Text>
                )}
              </View>
              {item.description && (
                <Text style={[styles.description, { color: colors.mutedFg }]} numberOfLines={2}>{item.description}</Text>
              )}
            </View>
            <Ionicons name="open-outline" size={18} color={colors.mutedFg} />
          </Pressable>
        )}
      />

      {isVerified && (
        <Pressable
          style={[styles.fab, shadow.blue, { backgroundColor: colors.primaryFill, bottom: 24 + insets.bottom }]}
          onPress={() => router.push('/whatsapp/new')}
          accessibilityRole="button"
          accessibilityLabel="Indicar grupo de WhatsApp"
        >
          <Ionicons name="logo-whatsapp" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.fabText}>Indicar grupo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { maxHeight: 48, marginTop: 12, marginBottom: 4 },
  // Altura fixa + centro: na FlatList horizontal o chip esticava e o texto ficava colado no topo.
  chip: { height: 38, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.xl, borderWidth: 1 },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  waIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  name: { fontFamily: fontFamily.bold, fontSize: 15, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  kindBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xl },
  kindText: { fontFamily: fontFamily.semibold, fontSize: 11 },
  members: { fontFamily: fontFamily.regular, fontSize: 11 },
  description: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
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
