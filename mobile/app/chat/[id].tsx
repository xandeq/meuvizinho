import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChatStore } from '../../src/lib/chat-store';
import { getHubConnection } from '../../src/lib/signalr';
import { useAuthStore } from '../../src/lib/auth-store';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { MessageComposer } from '../../src/components/chat/MessageComposer';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] ?? []
  );
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages);
  const setActive = useChatStore((s) => s.setActiveConversationId);
  const markRead = useChatStore((s) => s.markRead);
  const connect = useChatStore((s) => s.connect);

  const joinedRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    (async () => {
      await connect(); // ensures hub singleton + handlers registered
      await loadMessages(conversationId);
      if (cancelled) return;
      setActive(conversationId);
      markRead(conversationId);

      try {
        const conn = await getHubConnection();
        await conn.invoke('JoinConversation', conversationId);
        joinedRef.current = true;
      } catch (err) {
        console.warn('[chat] JoinConversation failed', err);
      }
    })();

    return () => {
      cancelled = true;
      setActive(null);
      if (joinedRef.current) {
        getHubConnection()
          .then((conn) => conn.invoke('LeaveConversation', conversationId))
          .catch(() => {
            // Connection may be down — withAutomaticReconnect handles recovery.
            // DO NOT call conn.start() here (Pitfall 2).
          });
      }
    };
  }, [conversationId]);

  if (!conversationId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.fg }}>Conversa inválida.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(m) => String(m.id)}
        inverted
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.senderId === currentUserId} />
        )}
        onEndReached={() => loadMoreMessages(conversationId)}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        }
      />
      <MessageComposer conversationId={conversationId} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
