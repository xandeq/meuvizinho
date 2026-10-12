import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';
import type { PostDto, PostCategory } from '../../lib/api/feed';

const CATEGORY_LABELS: Record<PostCategory, string> = {
  0: 'Dica',
  1: 'Alerta',
  2: 'Pergunta',
  3: 'Evento',
  4: 'Geral',
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function Avatar({ name, photoUrl, size = 36 }: { name: string | null; photoUrl: string | null; size?: number }) {
  const { colors } = useTheme();
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

interface PostCardProps {
  post: PostDto;
  onLike: (postId: number) => void;
}

export function PostCard({ post, onLike }: PostCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE = 160;
  const needsTruncate = post.body.length > TRUNCATE;
  const bodyText = !expanded && needsTruncate ? post.body.slice(0, TRUNCATE) + '…' : post.body;

  const categoryColor: Record<PostCategory, string> = {
    0: colors.primary,    // Dica — blue
    1: colors.danger,     // Alerta — red
    2: colors.accent,     // Pergunta — amber
    3: colors.secondary,  // Evento — emerald
    4: colors.mutedFg,    // Geral — slate
  };

  const s = styles(colors);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <Avatar name={post.author.displayName} photoUrl={post.author.photoUrl} />
        <View style={s.headerText}>
          <View style={s.nameRow}>
            <Text style={s.authorName} numberOfLines={1}>
              {post.author.displayName ?? 'Vizinho'}
            </Text>
            {post.author.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={colors.secondary} style={{ marginLeft: 3 }} />
            )}
          </View>
          <Text style={s.timestamp}>{relativeTime(post.createdAt)}</Text>
        </View>
        <View style={[s.categoryBadge, { backgroundColor: categoryColor[post.category] + '20', borderColor: categoryColor[post.category] + '40' }]}>
          <Text style={[s.categoryLabel, { color: categoryColor[post.category] }]}>
            {CATEGORY_LABELS[post.category]}
          </Text>
        </View>
      </View>

      {/* Body */}
      <Text style={s.body}>
        {bodyText}
        {needsTruncate && !expanded && (
          <Text onPress={() => setExpanded(true)} style={s.readMore}> ver mais</Text>
        )}
      </Text>

      {/* Images */}
      {post.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imageScroll}>
          {post.images
            .sort((a, b) => a.order - b.order)
            .map((img, i) => (
              <Image
                key={i}
                source={{ uri: img.url }}
                style={s.image}
                resizeMode="cover"
              />
            ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <Pressable style={s.actionBtn} onPress={() => onLike(post.id)}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={18}
            color={post.likedByMe ? colors.danger : colors.mutedFg}
          />
          <Text style={[s.actionCount, post.likedByMe && { color: colors.danger }]}>
            {post.likeCount > 0 ? post.likeCount : ''}
          </Text>
        </Pressable>
        <View style={s.actionBtn}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.mutedFg} />
          <Text style={s.actionCount}>{post.commentCount > 0 ? post.commentCount : ''}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('../../theme/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      marginHorizontal: 12,
      marginVertical: 5,
      padding: 14,
      ...shadow.ambientLow,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    headerText: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    authorName: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.fg, flex: 1 },
    timestamp: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.mutedFg, marginTop: 2 },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.xl,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    categoryLabel: { fontFamily: fontFamily.bold, fontSize: 11 },
    body: { fontFamily: fontFamily.regular, fontSize: 14, color: colors.fg, lineHeight: 20, marginBottom: 10 },
    readMore: { color: colors.primary, fontFamily: fontFamily.semibold },
    imageScroll: { marginBottom: 10, marginHorizontal: -14 },
    image: { width: 200, height: 150, borderRadius: radius.sm, marginHorizontal: 6 },
    actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionCount: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.mutedFg },
  });
