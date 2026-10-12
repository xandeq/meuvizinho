import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { useGroupStore } from '@/features/groups/useGroupStore';
import { getGroups, joinGroup } from '@/features/groups/groupsApi';
import type { Group } from '@/features/groups/groupsApi';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

export default function GroupsIndex() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
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

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.md }]}
      onPress={() => router.push(`/groups/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.groupName, { color: colors.fg }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.categoryBadge, { color: colors.mutedFg, backgroundColor: colors.muted, borderRadius: radius.xl }]}>{item.category}</Text>
      </View>
      <Text style={[styles.description, { color: colors.mutedFg }]} numberOfLines={2}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.memberCount, { color: colors.mutedFg }]}>{item.memberCount} membros</Text>
        <TouchableOpacity
          style={[styles.joinBtn, { backgroundColor: colors.secondary, borderRadius: radius.sm }]}
          onPress={() => handleJoin(item)}
          disabled={joiningId === item.id}
        >
          <Text style={styles.joinBtnText}>
            {joiningId === item.id ? '...' : 'Entrar'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.fg }]}>Grupos do Bairro</Text>
        <TouchableOpacity onPress={() => router.push('/groups/new')} style={[styles.createBtn, { backgroundColor: colors.secondary, borderRadius: radius.sm }]}>
          <Text style={styles.createBtnText}>+ Criar</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.search, { backgroundColor: colors.muted, color: colors.fg, borderRadius: radius.sm }]}
        placeholder="Buscar grupos..."
        placeholderTextColor={colors.mutedFg}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ marginTop: 40 }} />
      ) : !user?.bairroId ? (
        <Text style={[styles.empty, { color: colors.mutedFg }]}>Complete sua verificação para ver os grupos do bairro.</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => String(g.id)}
          renderItem={renderGroup}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedFg }]}>Nenhum grupo encontrado.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 22 },
  createBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  createBtnText: { color: '#fff', fontFamily: fontFamily.semibold, fontSize: 14 },
  search: { marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, fontFamily: fontFamily.regular, fontSize: 14 },
  card: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  groupName: { fontFamily: fontFamily.semibold, fontSize: 16, flex: 1, marginRight: 8 },
  categoryBadge: { fontFamily: fontFamily.semibold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 2 },
  description: { fontFamily: fontFamily.regular, fontSize: 13, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberCount: { fontFamily: fontFamily.regular, fontSize: 12 },
  joinBtn: { paddingHorizontal: 14, paddingVertical: 5 },
  joinBtnText: { color: '#fff', fontFamily: fontFamily.semibold, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40 },
});
