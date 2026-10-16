import { useEffect, useRef, useState } from 'react';
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
import { Stack } from 'expo-router';
import { fontFamily } from '../../src/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../../src/lib/useKeyboardHeight';
import { EmptyState } from '../../src/components/EmptyState';
import { FadeInView } from '../../src/lib/motion';


const NO_MESSAGES: never[] = [];
export default function ChatScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Fallback estável: `?? []` criava um array novo a cada render e o useSyncExternalStore
  // entrava em loop ("Maximum update depth exceeded"), derrubando o app ao abrir o chat.
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? NO_MESSAGES);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  // Teclado: o campo de mensagem ficava inteiro atrás dele (edge-to-edge no Android).
  // O Stack já recua a barra de navegação, então desconta para não dobrar o espaço.
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const keyboardPad = Math.max(0, keyboardHeight - insets.bottom);
  const loadConversations = useChatStore((s) => s.loadConversations);
  // Vindo do anúncio, a conversa recém-criada ainda não está no store: carrega para ter o título.
  useEffect(() => {
    if (conversationId && !conversation) loadConversations().catch(() => {});
  }, [conversationId, conversation, loadConversations]);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages);
  const setActive = useChatStore((s) => s.setActiveConversationId);
  const markRead = useChatStore((s) => s.markRead);
  const connect = useChatStore((s) => s.connect);

  const joinedRef = useRef(false);
  // Conversa nova (vinda de "Chat com vendedor") não tem mensagens: antes o spinner girava para sempre.
  const [loaded, setLoaded] = useState(false);
  const initialIds = useRef<Set<number>>(new Set());
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    (async () => {
      // Tempo real é extra: se o hub falhar, as mensagens ainda carregam por HTTP.
      try { await connect(); } catch (err) { console.warn('[chat] connect failed', err); }
      try {
        await loadMessages(conversationId);
        if (!cancelled) {
          initialIds.current = new Set((useChatStore.getState().messagesByConversation[conversationId] ?? []).map((m) => m.id));
          setLoaded(true); setLoadFailed(false);
        }
      } catch {
        if (!cancelled) { setLoaded(true); setLoadFailed(true); }
      }
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
      style={[styles.container, { backgroundColor: colors.bg, paddingBottom: keyboardPad }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Stack.Screen
        options={{
          title: conversation?.otherUserDisplayName ?? 'Chat',
          headerTitle: () => (
            <View>
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 17, color: colors.fg }} numberOfLines={1}>
                {conversation?.otherUserDisplayName ?? 'Chat'}
              </Text>
              {conversation?.listingTitle ? (
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, color: colors.mutedFg }} numberOfLines={1}>
                  {conversation.listingTitle}
                </Text>
              ) : null}
            </View>
          ),
        }}
      />
      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(m) => String(m.id)}
        inverted
        renderItem={({ item }) =>
          // Só mensagens que chegam/saem com a conversa aberta entram animadas; o histórico não.
          loaded && !initialIds.current.has(item.id) ? (
            <FadeInView>
              <MessageBubble message={item} isOwn={item.senderId === currentUserId} />
            </FadeInView>
          ) : (
            <MessageBubble message={item} isOwn={item.senderId === currentUserId} />
          )
        }
        onEndReached={() => loadMoreMessages(conversationId)}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          !loaded ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            // FlatList invertida: o vazio também aparece de cabeça para baixo sem o scaleY.
            <View style={{ transform: [{ scaleY: -1 }], flex: 1 }}>
              {loadFailed ? (
                <EmptyState icon="cloud-offline-outline" title="Não foi possível carregar as mensagens" subtitle="Verifique sua conexão e tente de novo." />
              ) : (
                <EmptyState icon="chatbubbles-outline" title="Diga oi ao vizinho" subtitle="Escreva a primeira mensagem abaixo." />
              )}
            </View>
          )
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
