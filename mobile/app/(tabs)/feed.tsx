import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth-store';
import { useFeedStore } from '../../src/lib/feed-store';
import { PostCard } from '../../src/components/feed/PostCard';
import { FeedComposer } from '../../src/components/feed/FeedComposer';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader, HeaderIconButton } from '../../src/components/ScreenHeader';
import { ListSkeleton } from '../../src/components/Skeleton';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, shadow } from '../../src/theme/tokens';
import type { PostCategory } from '../../src/lib/api/feed';
import { useBairroName } from '../../src/lib/useBairroName';
import { useNotificationsStore, selectUnread, useNotificationsLive } from '../../src/lib/notifications-store';

export default function FeedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const bairroName = useBairroName();
  const unread = useNotificationsStore(selectUnread);
  useNotificationsLive(true);
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
          <PostCard post={item} onLike={toggleLike} onOpenComments={(id) => router.push(`/post/${id}`)} />
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
          <ScreenHeader
            title="Bairro"
            place={bairroName}
            actions={
              <>
                <HeaderIconButton
                  icon="notifications-outline"
                  label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'}
                  badge={unread}
                  onPress={() => router.push('/notificacoes')}
                />
                <HeaderIconButton icon="map-outline" label="Mapa do bairro" onPress={() => router.push('/map')} />
                <HeaderIconButton icon="people-outline" label="Grupos" onPress={() => router.push('/groups')} />
                {/* '/profile' had no entry point anywhere in the app — this was the only way in. */}
                <HeaderIconButton icon="person-outline" label="Meu perfil" onPress={() => router.push('/profile')} />
              </>
            }
          />
        }
        ListEmptyComponent={
          loading ? <ListSkeleton rows={3} /> : (
            <EmptyState
              icon="chatbubbles-outline"
              title="Nenhum post no seu bairro ainda"
              subtitle={
                isVerified
                  ? 'Toque no botão + e compartilhe um aviso, uma dica ou uma pergunta com seus vizinhos.'
                  : 'Compartilhe um aviso, uma dica ou uma pergunta com seus vizinhos.'
              }
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
          style={({ pressed }) => [styles.fab, shadow.blue, { backgroundColor: colors.primaryFill, opacity: pressed ? 0.9 : 1 }]}
          onPress={() => setComposerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Publicar no bairro"
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.fabText}>Publicar</Text>
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
  // Pílula com rótulo, igual a "Novo anúncio" e "Cadastrar": ícone solto "+" não dizia o que fazia.
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
  },
  fabText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 15 },
});
