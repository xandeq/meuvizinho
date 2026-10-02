import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/lib/auth-store';
import { useFeedStore } from '../../src/lib/feed-store';
import { PostCard } from '../../src/components/feed/PostCard';
import { FeedComposer } from '../../src/components/feed/FeedComposer';
import { useTheme } from '../../src/theme/ThemeContext';
import type { PostCategory } from '../../src/lib/api/feed';

export default function FeedScreen() {
  const { colors } = useTheme();
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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.emptyText, { color: colors.mutedFg }]}>
          Complete sua verificação para ver o feed do bairro.
        </Text>
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
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedFg }]}>
                Nenhum post no seu bairro ainda.
              </Text>
              {isVerified && (
                <Pressable
                  style={[styles.emptyAction, { borderColor: colors.primary }]}
                  onPress={() => setComposerOpen(true)}
                >
                  <Text style={[styles.emptyActionText, { color: colors.primary }]}>
                    Criar o primeiro post
                  </Text>
                </Pressable>
              )}
            </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  emptyAction: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyActionText: { fontWeight: '700', fontSize: 14 },
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
