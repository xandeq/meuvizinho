import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, useWindowDimensions, Animated } from 'react-native';
import { usePop } from '../../lib/motion';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';
import type { PostDto, PostCategory } from '../../lib/api/feed';
import { toCategory } from '../../lib/postCategory';

const CATEGORY_LABELS: Record<PostCategory, string> = {
  0: 'Dica',
  1: 'Alerta',
  2: 'Pergunta',
  3: 'Evento',
  4: 'Geral',
};

const CATEGORY_ICONS: Record<PostCategory, keyof typeof Ionicons.glyphMap> = {
  0: 'bulb-outline',
  1: 'warning-outline',
  2: 'help-circle-outline',
  3: 'calendar-outline',
  4: 'chatbubble-ellipses-outline',
};

const CARD_MARGIN = 12;
const CARD_PADDING = 14;

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function Avatar({ name, photoUrl, size = 40 }: { name: string | null; photoUrl: string | null; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  // Filtra palavras que começam com letra antes de pegar as iniciais — nomes
  // como "Alexandre (Admin) Queiroz" geravam "A(" porque "(Admin)" virava a
  // 2ª palavra e seu 1º caractere é "(" (achado ao vivo testando o feed real).
  const initials = (name ?? '')
    .split(' ')
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (photoUrl && !failed) {
    return (
      <Image
        source={{ uri: photoUrl }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: initials ? colors.primaryFill : colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials ? (
        <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: size * 0.38 }}>{initials}</Text>
      ) : (
        // Sem nome: silhueta, nunca um "?" (parecia erro de carregamento).
        <Ionicons name="person" size={size * 0.5} color={colors.primary} />
      )}
    </View>
  );
}

// Foto com placeholder: enquanto carrega ou se o arquivo sumiu do servidor,
// o espaço mostra um ícone em vez de um buraco vazio no card.
function PostImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const { colors } = useTheme();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <View style={[styles.imageBox, { width, height, backgroundColor: colors.muted, borderColor: colors.border }]}>
      {state !== 'ok' && (
        <View style={styles.imagePlaceholder}>
          <Ionicons name={state === 'error' ? 'image-outline' : 'image'} size={26} color={colors.mutedFg} />
          {state === 'error' && <Text style={[styles.imageError, { color: colors.mutedFg }]}>Foto indisponível</Text>}
        </View>
      )}
      {state !== 'error' && (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

interface PostCardProps {
  post: PostDto;
  onLike: (postId: number) => void;
  onOpenComments?: (postId: number) => void;
}

export function PostCard({ post, onLike, onOpenComments }: PostCardProps) {
  // Coração "pula" ao curtir: confirma o toque sem esperar a resposta da API.
  const { scale: likeScale, pop: popLike } = usePop();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE = 220;
  const needsTruncate = post.body.length > TRUNCATE;
  const bodyText = !expanded && needsTruncate ? post.body.slice(0, TRUNCATE).trimEnd() + '…' : post.body;

  const categoryColor: Record<PostCategory, string> = {
    0: colors.primary,
    1: colors.danger,
    2: colors.accent,
    3: colors.primary,
    4: colors.mutedFg,
  };
  // A API manda o nome ("Dica"); o tipo do app era só número, e tudo virava "Geral".
  const cat = toCategory(post.category);
  const catColor = categoryColor[cat];
  const catLabel = CATEGORY_LABELS[cat];
  const catIcon = CATEGORY_ICONS[cat];

  const images = [...post.images].sort((a, b) => a.order - b.order);
  const innerWidth = screenWidth - CARD_MARGIN * 2 - CARD_PADDING * 2;
  const s = styles;

  return (
    <View style={[s.card, shadow.ambientLow, { backgroundColor: colors.card }]}>
      <View style={s.header}>
        <Avatar name={post.author.displayName} photoUrl={post.author.photoUrl} />
        <View style={s.headerText}>
          <View style={s.nameRow}>
            <Text style={[s.authorName, { color: colors.fg }]} numberOfLines={1}>
              {post.author.displayName ?? 'Vizinho'}
            </Text>
            {post.author.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.verified}
                accessibilityLabel="Endereço verificado"
              />
            )}
          </View>
          <View style={s.metaRow}>
            <Ionicons name={catIcon} size={12} color={catColor} />
            <Text style={[s.meta, { color: catColor }]}>{catLabel}</Text>
            <Text style={[s.meta, { color: colors.mutedFg }]}>· {relativeTime(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      <Text style={[s.body, { color: colors.fg }]}>
        {bodyText}
        {needsTruncate && !expanded && (
          <Text onPress={() => setExpanded(true)} style={[s.readMore, { color: colors.primary }]}> ver mais</Text>
        )}
      </Text>

      {images.length === 1 && (
        <View style={s.single}>
          <PostImage uri={images[0].url} width={innerWidth} height={Math.round(innerWidth * 0.66)} />
        </View>
      )}
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.imageScroll}
          contentContainerStyle={s.imageScrollContent}
        >
          {images.map((img, i) => (
            <PostImage
              key={`${img.url}-${i}`}
              uri={img.url}
              width={Math.round(innerWidth * 0.72)}
              height={Math.round(innerWidth * 0.54)}
            />
          ))}
        </ScrollView>
      )}

      <View style={[s.actions, { borderTopColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [s.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => { if (!post.likedByMe) popLike(); onLike(post.id); }}
          accessibilityRole="button"
          accessibilityState={{ selected: post.likedByMe }}
          accessibilityLabel={post.likedByMe ? 'Descurtir' : 'Curtir'}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={post.likedByMe ? 'heart' : 'heart-outline'}
              size={20}
              color={post.likedByMe ? colors.danger : colors.mutedFg}
            />
          </Animated.View>
          <Text style={[s.actionText, { color: post.likedByMe ? colors.danger : colors.mutedFg }]}>
            {post.likeCount > 0 ? post.likeCount : 'Curtir'}
          </Text>
        </Pressable>
        {/* Antes era só texto: no app não dava para ler nem responder comentários. */}
        <Pressable
          style={({ pressed }) => [s.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={onOpenComments ? () => onOpenComments(post.id) : undefined}
          disabled={!onOpenComments}
          accessibilityRole="button"
          accessibilityLabel={post.commentCount > 0 ? `${post.commentCount} ${post.commentCount === 1 ? 'comentário' : 'comentários'}, abrir` : 'Comentar'}
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.mutedFg} />
          <Text style={[s.actionText, { color: colors.mutedFg }]}>
            {post.commentCount > 0
              ? `${post.commentCount} ${post.commentCount === 1 ? 'comentário' : 'comentários'}`
              : 'Comentar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    marginHorizontal: CARD_MARGIN,
    marginVertical: 6,
    paddingHorizontal: CARD_PADDING,
    paddingTop: CARD_PADDING,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  headerText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorName: { fontFamily: fontFamily.bold, fontSize: 15, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontFamily: fontFamily.medium, fontSize: 12 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  readMore: { fontFamily: fontFamily.semibold },
  single: { marginBottom: 12 },
  imageScroll: { marginBottom: 12, marginHorizontal: -CARD_PADDING },
  imageScrollContent: { paddingHorizontal: CARD_PADDING, gap: 8 },
  imageBox: { borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  imagePlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 6 },
  imageError: { fontFamily: fontFamily.medium, fontSize: 12 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -4,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4, paddingRight: 12 },
  actionText: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
