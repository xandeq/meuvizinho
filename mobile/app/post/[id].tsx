import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../src/lib/api';
import { createFeedApi, type CommentDto, type PostDto } from '../../src/lib/api/feed';
import { useFeedStore } from '../../src/lib/feed-store';
import { useAuthStore } from '../../src/lib/auth-store';
import { PostCard } from '../../src/components/feed/PostCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useKeyboardHeight } from '../../src/lib/useKeyboardHeight';
import { apiErrorMessage } from '../../src/lib/apiError';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';

const feedApi = createFeedApi(apiClient);
const MAX = 500;

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function Initials({ name }: { name: string | null }) {
  const { colors } = useTheme();
  const ini = (name ?? '').split(' ').filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: colors.primaryFill }]}>
      {ini ? <Text style={styles.avatarText}>{ini}</Text> : <Ionicons name="person" size={16} color="#fff" />}
    </View>
  );
}

function CommentItem({ c, depth = 0 }: { c: CommentDto; depth?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginLeft: depth * 36 }}>
      <View style={styles.comment}>
        <Initials name={c.author.displayName} />
        <View style={[styles.bubble, { backgroundColor: colors.card }]}>
          <View style={styles.bubbleHead}>
            <Text style={[styles.author, { color: colors.fg }]} numberOfLines={1}>{c.author.displayName ?? 'Vizinho'}</Text>
            {c.author.isVerified ? <Ionicons name="checkmark-circle" size={14} color={colors.verified} accessibilityLabel="Endereço verificado" /> : null}
            <Text style={[styles.time, { color: colors.mutedFg }]}>· {timeAgo(c.createdAt)}</Text>
          </View>
          <Text style={[styles.body, { color: colors.fg }]}>{c.body}</Text>
        </View>
      </View>
      {c.replies?.map((r) => <CommentItem key={r.id} c={r} depth={Math.min(depth + 1, 1)} />)}
    </View>
  );
}

// Comentários no app (antes só o site tinha: no celular não dava para ler nem responder).
export default function PostComments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const storePost = useFeedStore((s) => s.posts.find((p) => p.id === postId));
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const bumpComments = useFeedStore((s) => s.bumpComments);
  const isVerified = useAuthStore((s) => s.user?.isVerified === true);
  const [post, setPost] = useState<PostDto | null>(storePost ?? null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, list] = await Promise.all([storePost ? Promise.resolve(storePost) : feedApi.getPost(postId), feedApi.getComments(postId)]);
      setPost(p);
      setComments(list);
    } catch (e) {
      setError(apiErrorMessage(e, 'Não foi possível carregar os comentários.'));
    } finally {
      setLoading(false);
    }
  }, [postId, storePost]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const created = await feedApi.createComment(postId, body);
      setComments((prev) => [...prev, { ...created, replies: created.replies ?? [] }]);
      setText('');
      bumpComments(postId);
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (e) {
      setError(apiErrorMessage(e, 'Não foi possível enviar o comentário.'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  const shownPost = storePost ?? post;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: keyboardHeight }}>
      <FlatList
        data={comments}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <CommentItem c={item} />}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {shownPost ? <PostCard post={shownPost} onLike={toggleLike} /> : null}
            <Text style={[styles.section, { color: colors.mutedFg }]}>
              {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'comentário' : 'comentários'}` : 'Comentários'}
            </Text>
            {error ? <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="chatbubbles-outline" title="Nenhum comentário ainda" subtitle="Seja o primeiro a responder seu vizinho." />
        }
      />
      {isVerified ? (
        <View style={[styles.composer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: 10 + (keyboardHeight ? 0 : insets.bottom) }]}>
          <TextInput
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX))}
            placeholder="Escreva um comentário"
            placeholderTextColor={colors.mutedFg}
            multiline
            accessibilityLabel="Escreva um comentário"
            style={[styles.input, { backgroundColor: colors.muted, color: colors.fg }]}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Enviar comentário"
            style={[styles.send, { backgroundColor: text.trim() ? colors.primaryFill : colors.muted }]}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color={text.trim() ? '#fff' : colors.mutedFg} />}
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.locked, { color: colors.mutedFg, paddingBottom: 12 + insets.bottom }]}>Confirme seu endereço para comentar.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontFamily: fontFamily.semibold, fontSize: 13, letterSpacing: 0.3, marginHorizontal: 16, marginTop: 10, marginBottom: 8 },
  error: { fontFamily: fontFamily.semibold, fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  comment: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 12 },
  bubble: { flex: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  author: { fontFamily: fontFamily.bold, fontSize: 14, flexShrink: 1 },
  time: { fontFamily: fontFamily.regular, fontSize: 12 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.md, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontFamily: fontFamily.regular, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  locked: { textAlign: 'center', fontFamily: fontFamily.medium, fontSize: 14, paddingTop: 12 },
});
