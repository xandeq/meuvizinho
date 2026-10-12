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
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { VerifiedBadge } from '../../src/components/VerifiedBadge';
import { ReportListingSheet } from '../../src/components/marketplace/ReportListingSheet';
import { RatingForm } from '../../src/components/marketplace/RatingForm';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import { chatApi } from '../../src/lib/api/chat';
import type { ListingDto } from '../../src/lib/api/marketplace.types';
import { useAuthStore } from '../../src/lib/auth-store';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';
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
  const { colors } = useTheme();

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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.secondary} />
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
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 32 }}>
      <FlatList
        data={listing.photos}
        keyExtractor={(p) => String(p.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} style={{ width, height: width }} />
        )}
        ListEmptyComponent={<View style={{ width, height: width, backgroundColor: colors.muted }} />}
      />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.fg }]}>{listing.title}</Text>
        <Text style={[styles.price, { color: colors.secondary }]}>{priceFormatter.format(listing.price)}</Text>
        {isSold && <Text style={[styles.soldTag, { backgroundColor: colors.fg }]}>VENDIDO</Text>}
        <View style={styles.sellerRow}>
          <Text style={[styles.sellerName, { color: colors.mutedFg }]}>{listing.sellerDisplayName}</Text>
          <VerifiedBadge verified={listing.sellerIsVerified} />
        </View>
        {!listing.sellerIsVerified && (
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle" size={14} color={colors.accent} />
            <Text style={[styles.warn, { color: colors.accent }]}>Vendedor não verificado</Text>
          </View>
        )}
        <Text style={[styles.description, { color: colors.mutedFg }]}>{listing.description}</Text>

        {!isOwner && !isSold && (
          <Button
            title="Chat com vendedor"
            icon="chatbubble"
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
            title={listing.isFavoritedByCurrentUser ? 'Favoritado' : 'Favoritar'}
            icon={listing.isFavoritedByCurrentUser ? 'heart' : 'heart-outline'}
            variant="outline"
            onPress={handleToggleFavorite}
          />
        )}

        {isOwner && !isSold && (
          <>
            <View style={{ height: 8 }} />
            <Button
              title="Editar"
              icon="create"
              variant="outline"
              onPress={() => router.push({ pathname: '/marketplace/edit/[id]', params: { id: listing.id } })}
            />
            <View style={{ height: 8 }} />
            <Button title="Marcar como vendido" icon="checkmark-done" onPress={handleMarkSold} loading={busy} />
            <View style={{ height: 8 }} />
            <Button title="Remover anúncio" icon="trash" variant="outline" onPress={handleDelete} />
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
              <Text style={[styles.reportLink, { color: colors.danger }]}>Denunciar anúncio</Text>
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
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 20, marginBottom: 8 },
  price: { fontFamily: fontFamily.extrabold, fontSize: 22, marginBottom: 8 },
  soldTag: {
    alignSelf: 'flex-start',
    color: '#fff',
    fontFamily: fontFamily.extrabold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.xs,
    marginBottom: 12,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sellerName: { fontFamily: fontFamily.semibold, fontSize: 14, marginRight: 8 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  warn: { fontFamily: fontFamily.medium, fontSize: 12 },
  description: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  reportLink: {
    textDecorationLine: 'underline',
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
});
