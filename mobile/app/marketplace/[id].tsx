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
import { fontFamily, radius, shadow } from '../../src/theme/tokens';
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
  const [photoIndex, setPhotoIndex] = useState(0);

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
        <ActivityIndicator color={colors.primary} />
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

  const photoCount = listing.photos.length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 32 }}>
      <View>
        <FlatList
          data={listing.photos}
          keyExtractor={(p) => String(p.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Image source={{ uri: item.url }} style={{ width, height: width }} />
          )}
          ListEmptyComponent={
            <View style={[styles.photoPlaceholder, { width, height: width, backgroundColor: colors.muted }]}>
              <Ionicons name="image-outline" size={40} color={colors.mutedFg} />
            </View>
          }
        />
        {isSold && (
          <View style={[styles.soldBadge, { backgroundColor: colors.fg }]}>
            <Text style={styles.soldBadgeText}>VENDIDO</Text>
          </View>
        )}
        {!isOwner && (
          <Pressable accessibilityRole="button"
            onPress={handleToggleFavorite}
            hitSlop={8}
            style={[styles.favoriteFab, shadow.ambientMid, { backgroundColor: colors.card }]}
          >
            <Ionicons
              name={listing.isFavoritedByCurrentUser ? 'heart' : 'heart-outline'}
              size={22}
              color={listing.isFavoritedByCurrentUser ? colors.danger : colors.mutedFg}
            />
          </Pressable>
        )}
        {photoCount > 1 && (
          <View style={styles.dotsRow}>
            {listing.photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.5)' },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.price, { color: listing.price === 0 ? colors.secondary : colors.fg }]}>{listing.price === 0 ? 'Doação' : priceFormatter.format(listing.price)}</Text>
        <Text style={[styles.title, { color: colors.fg }]}>{listing.title}</Text>

        <View style={[styles.sellerCard, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Text style={[styles.avatarText, { color: colors.mutedFg }]}>
              {listing.sellerDisplayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <View style={styles.sellerRow}>
              <Text style={[styles.sellerName, { color: colors.fg }]} numberOfLines={1}>{listing.sellerDisplayName}</Text>
              <VerifiedBadge verified={listing.sellerIsVerified} />
            </View>
            {!listing.sellerIsVerified && (
              <View style={styles.warnRow}>
                <Ionicons name="alert-circle" size={13} color={colors.accent} />
                <Text style={[styles.warn, { color: colors.accent }]}>Vendedor não verificado</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Descrição</Text>
        <Text style={[styles.description, { color: colors.fg }]}>{listing.description}</Text>

        <View style={styles.actions}>
          {!isOwner && !isSold && (
            <Button
              title="Chat com vendedor"
              icon="chatbubble"
              onPress={handleChatSeller}
              loading={busy}
            />
          )}
          <WhatsAppShareButton
            url={getListingShareUrl(String(listing.id))}
            text="Veja esta oferta no Meu Vizinho"
          />
        </View>

        {isOwner && (
          <View style={[styles.ownerSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Gerenciar anúncio</Text>
            <View style={styles.actions}>
              {!isSold && (
                <>
                  <Button
                    title="Editar"
                    icon="create"
                    variant="outline"
                    onPress={() => router.push({ pathname: '/marketplace/edit/[id]', params: { id: listing.id } })}
                  />
                  <Button title="Marcar como vendido" icon="checkmark-done" onPress={handleMarkSold} loading={busy} />
                </>
              )}
              <Button title="Remover anúncio" icon="trash" variant="danger" onPress={handleDelete} />
            </View>
          </View>
        )}

        {!isOwner && isSold && (
          <RatingForm
            sellerId={listing.sellerId}
            listingId={listing.id}
            onSubmitted={load}
          />
        )}

        {!isOwner && (
          <Pressable accessibilityRole="button" onPress={() => setReportOpen(true)} style={styles.reportRow} hitSlop={8}>
            <Ionicons name="flag-outline" size={14} color={colors.danger} />
            <Text style={[styles.reportLink, { color: colors.danger }]}>Denunciar anúncio</Text>
          </Pressable>
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
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  soldBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  soldBadgeText: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 12, letterSpacing: 0.5 },
  favoriteFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  body: { padding: 16 },
  price: { fontFamily: fontFamily.extrabold, fontSize: 24, marginBottom: 4 },
  title: { fontFamily: fontFamily.semibold, fontSize: 17, marginBottom: 16 },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.semibold, fontSize: 16 },
  sellerInfo: { flex: 1 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerName: { fontFamily: fontFamily.semibold, fontSize: 14, flexShrink: 1 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  warn: { fontFamily: fontFamily.medium, fontSize: 12 },
  sectionLabel: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  description: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  actions: { gap: 10 },
  ownerSection: { borderTopWidth: 1, marginTop: 20, paddingTop: 20 },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  reportLink: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
});
