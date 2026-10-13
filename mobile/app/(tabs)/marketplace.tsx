import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth-store';
import { useMarketplaceStore } from '../../src/lib/marketplace-store';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import type { CategoryDto } from '../../src/lib/api/marketplace.types';
import { ListingCard } from '../../src/components/marketplace/ListingCard';
import { FilterChips } from '../../src/components/marketplace/FilterChips';
import { EmptyState } from '../../src/components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../src/theme/tokens';

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const bairroId = user?.bairroId ?? 0;
  const isVerified = !!user?.isVerified;

  const listings = useMarketplaceStore((s) => s.listings);
  const loading = useMarketplaceStore((s) => s.loading);
  const refreshing = useMarketplaceStore((s) => s.refreshing);
  const hasMore = useMarketplaceStore((s) => s.hasMore);
  const loadFirstPage = useMarketplaceStore((s) => s.loadFirstPage);
  const loadNextPage = useMarketplaceStore((s) => s.loadNextPage);
  const refresh = useMarketplaceStore((s) => s.refresh);
  const filters = useMarketplaceStore((s) => s.filters);

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    marketplaceApi
      .listCategories()
      .then(setCategories)
      .catch((err) => console.warn('[marketplace] categories', err));
  }, []);

  useEffect(() => {
    if (bairroId) loadFirstPage(bairroId);
  }, [bairroId, filters.category, filters.verifiedOnly, filters.sort]);

  if (!bairroId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          icon="shield-checkmark-outline"
          title="Complete sua verificação"
          subtitle="Confirme seu endereço para ver o marketplace do seu bairro."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.searchBar}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.fg }]}
          placeholder="Buscar no bairro"
          placeholderTextColor={colors.mutedFg}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            if (search.trim().length === 0) {
              refresh(bairroId);
            } else {
              router.push({ pathname: '/marketplace/search', params: { q: search } });
            }
          }}
          returnKeyType="search"
        />
      </View>
      <FilterChips categories={categories} />
      <FlatList
        data={listings}
        keyExtractor={(l) => String(l.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refresh(bairroId)} />
        }
        onEndReached={() => hasMore && loadNextPage(bairroId)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="storefront-outline"
              title="Nenhum anúncio no seu bairro ainda"
              subtitle={
                isVerified
                  ? 'Toque em "Novo anúncio" e seja o primeiro vizinho a anunciar algo por aqui.'
                  : 'Seja o primeiro vizinho a anunciar algo por aqui.'
              }
            />
          )
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : null
        }
      />
      {isVerified && (
        <Pressable
          style={[styles.fab, shadow.blue, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/marketplace/new')}
        >
          <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.fabText}>Novo anúncio</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  searchInput: {
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  grid: { padding: 6, paddingBottom: 100 },
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
