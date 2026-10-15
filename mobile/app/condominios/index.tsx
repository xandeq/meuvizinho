import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/lib/auth-store';
import { getCondominiums, createCondominium } from '../../src/lib/api/community';
import { CONDOMINIUM_STATUS_LABELS, type CondominiumStatus, type CondominiumSummary } from '../../src/lib/api/community.types';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../src/theme/tokens';
import { ListSkeleton } from '../../src/components/Skeleton';
import { SearchField } from '../../src/components/SearchField';
import { useKeyboardHeight } from '../../src/lib/useKeyboardHeight';

const STATUS_COLOR: Record<CondominiumStatus, 'mutedFg' | 'accent' | 'secondary'> = {
  Unclaimed: 'mutedFg',
  ClaimPending: 'accent',
  Claimed: 'secondary',
};

export default function CondominiumsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const user = useAuthStore((s) => s.user);
  const isVerified = !!user?.isVerified;
  const bairroId = user?.bairroId ?? 0;

  const [condos, setCondos] = useState<CondominiumSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!bairroId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getCondominiums(bairroId, { search: search || undefined })
      .then(setCondos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [bairroId]);
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (newName.trim().length < 2) {
      Alert.alert('Nome obrigatório', 'Informe o nome do condomínio.');
      return;
    }
    if (!bairroId) return;
    setCreating(true);
    try {
      await createCondominium({
        bairroId,
        name: newName.trim(),
        addressLine: newAddress.trim() || undefined,
      });
      setNewName('');
      setNewAddress('');
      setShowCreate(false);
      load();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error || 'Não foi possível cadastrar.');
    } finally {
      setCreating(false);
    }
  };

  if (!bairroId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          icon="shield-checkmark-outline"
          title="Complete sua verificação"
          subtitle="Confirme seu endereço para ver os condomínios do seu bairro."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ marginTop: 12, marginBottom: 4 }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Buscar condomínio pelo nome" />
      </View>
      <FlatList
        data={condos}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12, flexGrow: 1 }}
        ListEmptyComponent={
          loading ? (
            <ListSkeleton rows={4} />
          ) : (
            <EmptyState
              icon="business-outline"
              title="Nenhum condomínio cadastrado"
              subtitle="Seu condomínio ainda não está no diretório do bairro."
            />
          )
        }
        renderItem={({ item }) => {
          const statusColor = colors[STATUS_COLOR[item.status]];
          return (
            <Pressable accessibilityRole="button"
              onPress={() => router.push({ pathname: '/condominios/[id]', params: { id: item.id } })}
              style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.lg }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="business" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: colors.fg }]} numberOfLines={1}>{item.name}</Text>
                {item.addressLine && (
                  <Text style={[styles.address, { color: colors.mutedFg }]} numberOfLines={1}>{item.addressLine}</Text>
                )}
                <View style={styles.metaRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{CONDOMINIUM_STATUS_LABELS[item.status]}</Text>
                  </View>
                  {item.unitsCount != null && (
                    <Text style={[styles.units, { color: colors.mutedFg }]}>{item.unitsCount} unidades</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
            </Pressable>
          );
        }}
      />

      {isVerified && (
        <Pressable accessibilityRole="button"
          style={[styles.fab, shadow.ambientHigh, { backgroundColor: colors.primaryFill, bottom: 24 + insets.bottom }]}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={22} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.fabText}>Cadastrar</Text>
        </Pressable>
      )}

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowCreate(false)} accessibilityRole="button" accessibilityLabel="Fechar" />
        <View style={[styles.sheet, shadow.ambientHigh, { backgroundColor: colors.card, paddingBottom: 20 + insets.bottom, bottom: keyboardHeight }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.fg }]}>Cadastrar condomínio</Text>
            <Pressable
              onPress={() => setShowCreate(false)}
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: colors.muted }]}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={18} color={colors.mutedFg} />
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.fg, borderRadius: radius.sm }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome (ex: Edifício Solar)"
            placeholderTextColor={colors.mutedFg}
          />
          <View style={{ height: 10 }} />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.fg, borderRadius: radius.sm }]}
            value={newAddress}
            onChangeText={setNewAddress}
            placeholder="Endereço (opcional)"
            placeholderTextColor={colors.mutedFg}
          />
          <View style={{ height: 14 }} />
          <Button title="Cadastrar" icon="business-outline" onPress={handleCreate} loading={creating} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  name: { fontFamily: fontFamily.bold, fontSize: 15, marginBottom: 2 },
  address: { fontFamily: fontFamily.regular, fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xl },
  statusText: { fontFamily: fontFamily.semibold, fontSize: 11 },
  units: { fontFamily: fontFamily.regular, fontSize: 11 },
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontFamily: fontFamily.bold, fontSize: 17 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 14 },
});
