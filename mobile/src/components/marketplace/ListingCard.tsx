import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ListingDto } from '../../lib/api/marketplace.types';
import { FadeInView } from '../../lib/motion';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';

interface Props {
  listing: ListingDto;
  onPress: () => void;
  /** Posição na grade: escalona a entrada dos primeiros cards. */
  index?: number;
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function ListingCard({ listing, onPress, index = 0 }: Props) {
  const { colors } = useTheme();
  const cover = listing.photos[0]?.thumbnailUrl || listing.photos[0]?.url;
  // Foto que não carrega (arquivo removido, URL de outro ambiente) deixava só um quadrado cinza.
  const [coverFailed, setCoverFailed] = useState(false);
  const isSold = listing.status === 'sold';

  return (
    // Em grade de 2 colunas, item sozinho na linha (resultado único, lista ímpar) esticava na
    // largura toda. A coluna fixa em 50% mantém o card do mesmo tamanho dos outros.
    <FadeInView style={styles.cell} delay={index < 6 ? index * 45 : 0}>
    <Pressable
      style={({ pressed }) => [
        styles.card,
        shadow.ambientLow,
        { backgroundColor: colors.card, borderRadius: radius.lg },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.price === 0 ? 'doação' : priceFormatter.format(listing.price)}, por ${listing.sellerDisplayName ?? 'vizinho'}${listing.sellerIsVerified ? ' (verificado)' : ''}${isSold ? ', vendido' : ''}`}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.muted }]}>
        {cover && !coverFailed ? (
          <Image source={{ uri: cover }} style={styles.image} accessibilityIgnoresInvertColors onError={() => setCoverFailed(true)} />
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
        {/* Antes: só uma pílula com o ícone, sem texto. Agora quem vende, como no site. */}
        <View style={styles.sellerRow}>
          <Text style={[styles.seller, { color: colors.mutedFg }]} numberOfLines={1}>
            {listing.sellerDisplayName ?? 'Vizinho'}
          </Text>
          {listing.sellerIsVerified ? (
            <Ionicons name="checkmark-circle" size={14} color={colors.verified} accessibilityLabel="Endereço verificado" />
          ) : null}
        </View>
      </View>
    </Pressable>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  cell: { width: '50%' },
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
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seller: { fontFamily: fontFamily.medium, fontSize: 12, flexShrink: 1 },
});
