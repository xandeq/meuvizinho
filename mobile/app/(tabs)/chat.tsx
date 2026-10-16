import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChatStore } from '../../src/lib/chat-store';
import { EmptyState } from '../../src/components/EmptyState';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';
import { ScreenHeader } from '../../src/components/ScreenHeader';

export default function ConversationListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const connect = useChatStore((s) => s.connect);
  const loadUnread = useChatStore((s) => s.loadUnreadCount);

  useEffect(() => {
    loadConversations();
    loadUnread();
    connect();
  }, []);

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.bg }]}
      data={sorted}
      keyExtractor={(c) => String(c.id)}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={loadConversations} tintColor={colors.primary} />
      }
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button"
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
        >
          {item.listingThumbnailUrl ? (
            <Image source={{ uri: item.listingThumbnailUrl }} style={[styles.thumb, { backgroundColor: colors.muted }]} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: colors.muted }]}>
              <Ionicons name="pricetag-outline" size={20} color={colors.mutedFg} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {/* Antes: só nome e anúncio. Agora o que foi dito por último, quando e se é seu. */}
            <View style={styles.titleRow}>
              <Text style={[styles.name, { color: colors.fg }]} numberOfLines={1}>
                {item.otherUserDisplayName || 'Vizinho'}
              </Text>
              {item.otherUserIsVerified ? (
                <Ionicons name="checkmark-circle" size={15} color={colors.verified} accessibilityLabel="Endereço verificado" />
              ) : null}
              <Text style={[styles.time, { color: item.unreadCount > 0 ? colors.primary : colors.mutedFg }]}>
                {formatWhen(item.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text
                style={[styles.preview, { color: item.unreadCount > 0 ? colors.fg : colors.mutedFg }, item.unreadCount > 0 && styles.previewUnread]}
                numberOfLines={1}
              >
                {item.lastMessagePreview
                  ? `${item.lastMessageIsMine ? 'Você: ' : ''}${item.lastMessagePreview}`
                  : 'Nenhuma mensagem ainda'}
              </Text>
              {item.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primaryFill }]} accessibilityLabel={`${item.unreadCount} não lidas`}>
                  <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.listing, { color: colors.mutedFg }]} numberOfLines={1}>
              {item.listingTitle}
            </Text>
          </View>
        </Pressable>
      )}
      ListHeaderComponent={<ScreenHeader title="Conversas" />}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Nenhuma conversa ainda"
          subtitle="As conversas começam num anúncio do Mercado: toque em Chat com vendedor."
          actionLabel="Ver o Mercado"
          actionIcon="storefront-outline"
          onAction={() => router.push('/marketplace')}
        />
      }
    />
  );
}

// Hoje: 14:05 · ontem · dia da semana nesta semana · 12/10 antes disso.
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'ontem';
  if (days < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56, borderRadius: radius.md, marginRight: 12 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontFamily: fontFamily.bold, fontSize: 15, flexShrink: 1 },
  time: { fontFamily: fontFamily.regular, fontSize: 12, marginLeft: 'auto', paddingLeft: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  preview: { fontFamily: fontFamily.regular, fontSize: 14, flex: 1 },
  previewUnread: { fontFamily: fontFamily.semibold },
  listing: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 12 },
});
