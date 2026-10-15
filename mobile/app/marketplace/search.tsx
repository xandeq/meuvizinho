import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import { ListingCard } from '../../src/components/marketplace/ListingCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchField } from '../../src/components/SearchField';
import { useAuthStore } from '../../src/lib/auth-store';
import { apiErrorMessage } from '../../src/lib/apiError';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily } from '../../src/theme/tokens';
import type { ListingDto } from '../../src/lib/api/marketplace.types';
import { VerificationGate } from '../../src/components/VerificationGate';

// Antes: título "Buscar" sem o termo, sem campo para refinar e sem dizer quantos achou.
export default function MarketplaceSearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const bairroId = useAuthStore((s) => s.user?.bairroId ?? 0);
  const [term, setTerm] = useState(q ?? '');
  const [items, setItems] = useState<ListingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTerm(q ?? '');
    if (!bairroId || !q) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    marketplaceApi
      .search(bairroId, q)
      .then((page) => setItems(page.items))
      .catch((e) => setError(apiErrorMessage(e, 'Não foi possível buscar agora.')))
      .finally(() => setLoading(false));
  }, [q, bairroId]);

  const submit = () => {
    const t = term.trim();
    if (t && t !== q) router.setParams({ q: t });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: q ? `Busca: ${q}` : 'Buscar' }} />
      <SearchField
        placeholder="Buscar anúncios no bairro"
        value={term}
        onChangeText={setTerm}
        onSubmitEditing={submit}
        returnKeyType="search"
        autoFocus={!q}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => String(l.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 6, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={[styles.count, { color: colors.mutedFg }]} accessibilityLiveRegion="polite">
                {items.length} {items.length === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            !bairroId ? (
              <VerificationGate what="o Mercado do seu bairro" />
            ) : error ? (
              <EmptyState icon="cloud-offline-outline" title="Não foi possível buscar" subtitle={error} />
            ) : (
              <EmptyState
                icon="search-outline"
                title={`Nenhum resultado para "${q}"`}
                subtitle="Tente uma palavra mais curta ou outro termo."
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: 'center' },
  count: { fontFamily: fontFamily.medium, fontSize: 13, marginHorizontal: 10, marginTop: 4, marginBottom: 6 },
});
