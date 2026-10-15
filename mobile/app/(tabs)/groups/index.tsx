import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { useGroupStore } from '@/features/groups/useGroupStore';
import { getGroups, joinGroup } from '@/features/groups/groupsApi';
import type { Group } from '@/features/groups/groupsApi';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { ListSkeleton } from '../../../src/components/Skeleton';
import { useBairroName } from '../../../src/lib/useBairroName';
import { SearchField } from '../../../src/components/SearchField';
import { goBackOr } from '../../../src/lib/navigation';

type IconName = keyof typeof Ionicons.glyphMap;

const COMMUNITY_LINKS: { icon: IconName; iconColor: 'whatsapp' | 'primary'; title: string; sub: string; href: Href }[] = [
  { icon: 'logo-whatsapp', iconColor: 'whatsapp', title: 'Grupos de WhatsApp', sub: 'Diretório verificado do bairro', href: '/whatsapp' },
  { icon: 'business-outline', iconColor: 'primary', title: 'Condomínios', sub: 'Comunicados, reservas e síndico', href: '/condominios' },
];

// Verde da marca WhatsApp: é logotipo de terceiro, não o verde de verificação do app.
const WHATSAPP_GREEN = '#25D366';

const memberLabel = (n: number) => `${n} ${n === 1 ? 'membro' : 'membros'}`;

export default function GroupsIndex() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const bairroName = useBairroName();
  const { groups, setGroups } = useGroupStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!user?.bairroId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getGroups(user.bairroId, { search: search || undefined })
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [user?.bairroId, search]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (group: Group) => {
    setJoiningId(group.id);
    try {
      await joinGroup(group.id);
      router.push(`/groups/${group.id}`);
    } finally {
      setJoiningId(null);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const isMember = item.myStatus === 'Active';
    const isPending = item.myStatus === 'PendingApproval';
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          shadow.ambientLow,
          { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => router.push(`/groups/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${memberLabel(item.memberCount)}`}
      >
        <View style={[styles.groupAvatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.groupInitial, { color: colors.primary }]}>{item.name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.groupName, { color: colors.fg }]} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={[styles.description, { color: colors.mutedFg }]} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.categoryText, { color: colors.mutedFg }]}>{item.category}</Text>
            </View>
            <Ionicons name="people-outline" size={13} color={colors.mutedFg} />
            <Text style={[styles.memberCount, { color: colors.mutedFg }]}>{memberLabel(item.memberCount)}</Text>
            {item.joinPolicy === 'Closed' && <Ionicons name="lock-closed-outline" size={12} color={colors.mutedFg} />}
          </View>
        </View>
        {isMember ? (
          <Ionicons name="chevron-forward" size={20} color={colors.mutedFg} />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.joinBtn,
              { borderColor: colors.primary, opacity: pressed || joiningId === item.id || isPending ? 0.6 : 1 },
            ]}
            onPress={() => handleJoin(item)}
            disabled={joiningId === item.id || isPending}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={isPending ? `Pedido para ${item.name} pendente` : `Entrar em ${item.name}`}
          >
            {joiningId === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.joinBtnText, { color: colors.primary }]}>{isPending ? 'Pendente' : 'Entrar'}</Text>
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  const header = (
    <View>
      <ScreenHeader
onBack={() => goBackOr(router, '/(tabs)/feed')}         title="Grupos"
        place={bairroName}
        actions={
          <Pressable
            onPress={() => router.push('/groups/new')}
            style={({ pressed }) => [styles.createBtn, shadow.blue, { backgroundColor: colors.primaryFill, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Criar grupo"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Criar</Text>
          </Pressable>
        }
      />
      <SearchField value={search} onChangeText={setSearch} placeholder="Buscar grupos do bairro" />

      <View style={[styles.links, shadow.ambientLow, { backgroundColor: colors.card }]}>
        {COMMUNITY_LINKS.map((l, i) => (
          <Pressable
            key={l.title}
            onPress={() => router.push(l.href)}
            accessibilityRole="button"
            accessibilityLabel={l.title}
            style={({ pressed }) => [
              styles.linkRow,
              i < COMMUNITY_LINKS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View
              style={[
                styles.linkIcon,
                { backgroundColor: l.iconColor === 'whatsapp' ? WHATSAPP_GREEN + '1F' : colors.primaryLight },
              ]}
            >
              <Ionicons name={l.icon} size={20} color={l.iconColor === 'whatsapp' ? WHATSAPP_GREEN : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.linkTitle, { color: colors.fg }]}>{l.title}</Text>
              <Text style={[styles.linkSub, { color: colors.mutedFg }]}>{l.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Grupos do bairro</Text>
    </View>
  );

  if (!user?.bairroId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ScreenHeader title="Grupos" />
        <EmptyState
          icon="shield-checkmark-outline"
          title="Complete sua verificação"
          subtitle="Confirme seu endereço para ver os grupos do seu bairro."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={loading ? [] : groups}
        keyExtractor={(g) => String(g.id)}
        renderItem={renderGroup}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <ListSkeleton rows={3} />
          ) : (
            <EmptyState
              icon="people-outline"
              title={search ? 'Nenhum grupo com esse nome' : 'Nenhum grupo ainda'}
              subtitle={
                search
                  ? 'Tente outra palavra ou crie o grupo que está faltando.'
                  : 'Crie o primeiro grupo do seu bairro: corrida, pais da escola, horta, o que fizer sentido.'
              }
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 32, flexGrow: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, height: 44, borderRadius: radius.md },
  createBtnText: { color: '#fff', fontFamily: fontFamily.semibold, fontSize: 15 },
  links: { marginHorizontal: 16, marginTop: 16, borderRadius: radius.lg, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  linkIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  linkSub: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 1 },
  sectionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: radius.lg,
  },
  groupAvatar: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  groupInitial: { fontFamily: fontFamily.extrabold, fontSize: 20 },
  cardBody: { flex: 1, gap: 3 },
  groupName: { fontFamily: fontFamily.bold, fontSize: 16 },
  description: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xl, marginRight: 4 },
  categoryText: { fontFamily: fontFamily.semibold, fontSize: 11 },
  memberCount: { fontFamily: fontFamily.medium, fontSize: 12 },
  joinBtn: {
    minWidth: 76,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { fontFamily: fontFamily.semibold, fontSize: 14 },
});
