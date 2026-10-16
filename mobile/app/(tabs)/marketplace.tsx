import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth-store';
import { useMarketplaceStore } from '../../src/lib/marketplace-store';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import type { CategoryDto } from '../../src/lib/api/marketplace.types';
import { ListingCard } from '../../src/components/marketplace/ListingCard';
import { FilterChips } from '../../src/components/marketplace/FilterChips';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { GridSkeleton } from '../../src/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../src/theme/tokens';
import { useBairroName } from '../../src/lib/useBairroName';
import { SearchField } from '../../src/components/SearchField';
import { VerificationGate } from '../../src/components/VerificationGate';

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const bairroName = useBairroName();
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

  // Ao voltar de criar/excluir/marcar vendido a grade não mudava: o anúncio excluído seguia lá
  // e o novo só aparecia puxando para atualizar. Recarrega ao ganhar foco (não na 1ª montagem).
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) { focusedOnce.current = true; return; }
      if (bairroId) loadFirstPage(bairroId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bairroId])
  );

  if (!bairroId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <VerificationGate what="o Mercado do seu bairro" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Mercado" place={bairroName} />
      <SearchField
          placeholder="Buscar anúncios no bairro"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            if (search.trim().length === 0) {
              refresh(bairroId);
            } else {
              router.push({ pathname: '/marketplace/search', params: { q: search } });
            }
          }}
        />
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
          loading ? <GridSkeleton /> : (
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
          loading && listings.length > 0 ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : null
        }
      />
      {isVerified && (
        <Pressable
          style={[styles.fab, shadow.blue, { backgroundColor: colors.primaryFill }]}
          onPress={() => router.push('/marketplace/new')}
          accessibilityRole="button"
          accessibilityLabel="Novo anúncio"
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
