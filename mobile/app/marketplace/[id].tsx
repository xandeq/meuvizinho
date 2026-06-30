import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { VerifiedBadge } from '../../src/components/VerifiedBadge';
import { ReportListingSheet } from '../../src/components/marketplace/ReportListingSheet';
import { RatingForm } from '../../src/components/marketplace/RatingForm';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import { chatApi } from '../../src/lib/api/chat';
import type { ListingDto } from '../../src/lib/api/marketplace.types';
import { useAuthStore } from '../../src/lib/auth-store';
import WhatsAppShareButton from '../../src/features/share/components/WhatsAppShareButton';
import { getListingShareUrl } from '../../src/features/share/utils/share';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [listing, setListing] = useState<ListingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.get(listingId);
      setListing(data);
    } catch {
      Alert.alert('Erro', 'Anúncio não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) load();
  }, [listingId]);

  if (loading || !listing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#16A34A" />
      </View>
    );
  }

  const isOwner = currentUserId === listing.sellerId;
  const isSold = listing.status === 'sold';

  const handleChatSeller = async () => {
    setBusy(true);
    try {
      const conv = await chatApi.createConversation(listing.id);
      router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a conversa.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSold = async () => {
    setBusy(true);
    try {
      const updated = await marketplaceApi.markSold(listing.id);
      setListing(updated);
    } catch {
      Alert.alert('Erro', 'Não foi possível marcar como vendido.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Remover anúncio', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await marketplaceApi.remove(listing.id);
            router.back();
          } catch {
            Alert.alert('Erro', 'Falha ao remover.');
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async () => {
    try {
      const result = await marketplaceApi.toggleFavorite(listing.id);
      setListing({ ...listing, isFavoritedByCurrentUser: result.favorited });
    } catch {
      // silent
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <FlatList
        data={listing.photos}
        keyExtractor={(p) => String(p.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} style={{ width, height: width }} />
        )}
        ListEmptyComponent={<View style={{ width, height: width, backgroundColor: '#E5E7EB' }} />}
      />
      <View style={styles.body}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{priceFormatter.format(listing.price)}</Text>
        {isSold && <Text style={styles.soldTag}>VENDIDO</Text>}
        <View style={styles.sellerRow}>
          <Text style={styles.sellerName}>{listing.sellerDisplayName}</Text>
          <VerifiedBadge verified={listing.sellerIsVerified} />
        </View>
        {!listing.sellerIsVerified && (
          <Text style={styles.warn}>⚠️ Vendedor não verificado</Text>
        )}
        <Text style={styles.description}>{listing.description}</Text>

        {!isOwner && !isSold && (
          <Button
            title="Chat com vendedor"
            onPress={handleChatSeller}
            loading={busy}
          />
        )}
        <View style={{ height: 8 }} />
        <WhatsAppShareButton
          url={getListingShareUrl(String(listing.id))}
          text="Veja esta oferta no Meu Vizinho"
        />
        <View style={{ height: 8 }} />
        {!isOwner && (
          <Button
            title={listing.isFavoritedByCurrentUser ? '\u2665 Favoritado' : '\u2661 Favoritar'}
            variant="outline"
            onPress={handleToggleFavorite}
          />
        )}

        {isOwner && !isSold && (
          <>
            <View style={{ height: 8 }} />
            <Button
              title="Editar"
              variant="outline"
              onPress={() => router.push({ pathname: '/marketplace/edit/[id]', params: { id: listing.id } })}
            />
            <View style={{ height: 8 }} />
            <Button title="Marcar como vendido" onPress={handleMarkSold} loading={busy} />
            <View style={{ height: 8 }} />
            <Button title="Remover anúncio" variant="outline" onPress={handleDelete} />
          </>
        )}

        {!isOwner && isSold && (
          <RatingForm
            sellerId={listing.sellerId}
            listingId={listing.id}
            onSubmitted={load}
          />
        )}

        {!isOwner && (
          <>
            <View style={{ height: 16 }} />
            <Pressable onPress={() => setReportOpen(true)}>
              <Text style={styles.reportLink}>Denunciar anúncio</Text>
            </Pressable>
          </>
        )}
      </View>
      <ReportListingSheet
        visible={reportOpen}
        listingId={listing.id}
        onClose={() => setReportOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  price: { fontSize: 22, fontWeight: '900', color: '#16A34A', marginBottom: 8 },
  soldTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    color: '#fff',
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sellerName: { fontSize: 14, color: '#374151', fontWeight: '600', marginRight: 8 },
  warn: { color: '#B45309', fontSize: 12, marginBottom: 12 },
  description: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 20 },
  reportLink: {
    color: '#DC2626',
    textDecorationLine: 'underline',
    textAlign: 'center',
    fontSize: 13,
  },
});
