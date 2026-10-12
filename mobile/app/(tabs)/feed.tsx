import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth-store';
import { useFeedStore } from '../../src/lib/feed-store';
import { PostCard } from '../../src/components/feed/PostCard';
import { FeedComposer } from '../../src/components/feed/FeedComposer';
import { EmptyState } from '../../src/components/EmptyState';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily } from '../../src/theme/tokens';
import type { PostCategory } from '../../src/lib/api/feed';

export default function FeedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const bairroId = user?.bairroId ?? 0;
  const isVerified = !!user?.isVerified;

  const posts = useFeedStore((s) => s.posts);
  const loading = useFeedStore((s) => s.loading);
  const refreshing = useFeedStore((s) => s.refreshing);
  const hasMore = useFeedStore((s) => s.hasMore);
  const loadFirstPage = useFeedStore((s) => s.loadFirstPage);
  const loadNextPage = useFeedStore((s) => s.loadNextPage);
  const refresh = useFeedStore((s) => s.refresh);
  const createPost = useFeedStore((s) => s.createPost);
  const toggleLike = useFeedStore((s) => s.toggleLike);

  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (bairroId) loadFirstPage(bairroId);
  }, [bairroId]);

  if (!bairroId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          icon="shield-checkmark-outline"
          title="Complete sua verificação"
          subtitle="Confirme seu endereço para ver o feed do seu bairro."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <PostCard post={item} onLike={toggleLike} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh(bairroId)}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => hasMore && loadNextPage(bairroId)}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.fg }]}>Bairro</Text>
            {/* '/profile' had no entry point anywhere in the app — this was the only way in. */}
            <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
              <Ionicons name="person-circle-outline" size={30} color={colors.fg} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="chatbubbles-outline"
              title="Nenhum post no seu bairro ainda"
              subtitle="Compartilhe um aviso, uma dica ou uma pergunta com seus vizinhos."
              {...(isVerified
                ? { actionLabel: 'Criar o primeiro post', actionIcon: 'add', onAction: () => setComposerOpen(true) }
                : {})}
            />
          )
        }
        ListFooterComponent={
          loading && posts.length > 0
            ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
            : null
        }
      />

      {/* FAB — only for verified users */}
      {isVerified && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setComposerOpen(true)}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      )}

      <FeedComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={(cat: PostCategory, body: string) => createPost(cat, body)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerTitle: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});
