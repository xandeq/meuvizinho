import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ListingDto } from '../../lib/api/marketplace.types';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';

interface Props {
  listing: ListingDto;
  onPress: () => void;
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function ListingCard({ listing, onPress }: Props) {
  const { colors } = useTheme();
  const cover = listing.photos[0]?.thumbnailUrl || listing.photos[0]?.url;
  const isSold = listing.status === 'sold';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        shadow.ambientLow,
        { backgroundColor: colors.card, borderRadius: radius.lg },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.price === 0 ? 'doação' : priceFormatter.format(listing.price)}${isSold ? ', vendido' : ''}`}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.muted }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.image, styles.noPhoto]}>
            <Ionicons name="image-outline" size={28} color={colors.mutedFg} />
          </View>
        )}
        {isSold && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldText}>VENDIDO</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.fg }]} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={[styles.price, { color: listing.price === 0 ? colors.secondary : colors.fg }]}>{listing.price === 0 ? 'Doação' : priceFormatter.format(listing.price)}</Text>
        <View style={styles.sellerRow}>
          <VerifiedBadge verified={listing.sellerIsVerified} compact />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    overflow: 'hidden',
  },
  imageWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
  image: { width: '100%', height: '100%' },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldText: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 18, letterSpacing: 2 },
  body: { padding: 12 },
  title: { fontFamily: fontFamily.semibold, fontSize: 14, marginBottom: 4 },
  price: { fontFamily: fontFamily.extrabold, fontSize: 16, marginBottom: 6 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
});
