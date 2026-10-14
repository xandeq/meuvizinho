import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import { ListingCard } from '../../src/components/marketplace/ListingCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/lib/auth-store';
import { useTheme } from '../../src/theme/ThemeContext';
import type { ListingDto } from '../../src/lib/api/marketplace.types';

export default function MarketplaceSearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const bairroId = useAuthStore((s) => s.user?.bairroId ?? 0);
  const [items, setItems] = useState<ListingDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bairroId || !q) {
      setLoading(false);
      return;
    }
    setLoading(true);
    marketplaceApi
      .search(bairroId, q)
      .then((page) => setItems(page.items))
      .finally(() => setLoading(false));
  }, [q, bairroId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(l) => String(l.id)}
      numColumns={2}
      contentContainerStyle={{ padding: 6, flexGrow: 1, backgroundColor: colors.bg }}
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: item.id } })}
        />
      )}
      ListEmptyComponent={
        !bairroId ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Complete sua verificação"
            subtitle="Confirme seu endereço para buscar no marketplace."
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title={`Nenhum resultado para "${q}"`}
            subtitle="Tente outro termo ou busque em outra categoria."
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: 'center' },
});
