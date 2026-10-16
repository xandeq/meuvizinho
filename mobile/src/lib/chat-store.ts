import { create } from 'zustand';
import { chatApi, type ConversationDto, type MessageDto } from './api/chat';
import { getHubConnection } from './signalr';

interface ChatState {
  conversations: ConversationDto[];
  messagesByConversation: Record<number, MessageDto[]>;
  activeConversationId: number | null;
  unreadTotal: number;
  hubRegistered: boolean;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: number) => Promise<void>;
  loadMoreMessages: (conversationId: number) => Promise<void>;
  sendMessage: (
    conversationId: number,
    text: string,
    image?: { uri: string; name: string; type: string }
  ) => Promise<void>;
  appendMessage: (msg: MessageDto) => void;
  setActiveConversationId: (id: number | null) => void;
  markRead: (conversationId: number) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  setUnreadTotal: (total: number) => void;

  /**
   * Establish the shared SignalR connection and register server→client handlers
   * exactly once. Pitfall 2: does NOT call start() inside onclose or AppState.
   */
  connect: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  unreadTotal: 0,
  hubRegistered: false,

  loadConversations: async () => {
    try {
      const list = await chatApi.listConversations();
      set({ conversations: list });
    } catch (err) {
      console.warn('[chat] loadConversations failed', err);
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const messages = await chatApi.getHistory(conversationId);
      // History is returned newest-first from API; store oldest-first for FlatList inverted
      const sorted = messages
        .slice()
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      set((s) => ({
        messagesByConversation: { ...s.messagesByConversation, [conversationId]: sorted },
      }));
    } catch (err) {
      console.warn('[chat] loadMessages failed', err);
      throw err; // a tela mostra o erro em vez de spinner eterno
    }
  },

  loadMoreMessages: async (conversationId) => {
    const existing = get().messagesByConversation[conversationId] ?? [];
    if (existing.length === 0) {
      return get().loadMessages(conversationId);
    }
    const before = existing[0]?.sentAt;
    try {
      const older = await chatApi.getHistory(conversationId, before);
      if (older.length === 0) return;
      const sortedOlder = older
        .slice()
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      set((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: [...sortedOlder, ...(s.messagesByConversation[conversationId] ?? [])],
        },
      }));
    } catch (err) {
      console.warn('[chat] loadMoreMessages failed', err);
    }
  },

  sendMessage: async (conversationId, text, image) => {
    if (!text && !image) return;
    try {
      const msg = await chatApi.sendMessage(conversationId, text, image);
      get().appendMessage(msg);
    } catch (err) {
      console.warn('[chat] sendMessage failed', err);
      throw err;
    }
  },

  appendMessage: (msg) =>
    set((s) => {
      const list = s.messagesByConversation[msg.conversationId] ?? [];
      if (list.some((m) => m.id === msg.id)) return s;
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [msg.conversationId]: [...list, msg],
        },
      };
    }),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  markRead: async (conversationId) => {
    try {
      await chatApi.markRead(conversationId);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (err) {
      console.warn('[chat] markRead failed', err);
    }
  },

  loadUnreadCount: async () => {
    try {
      const { total } = await chatApi.getUnreadCount();
      set({ unreadTotal: total });
    } catch (err) {
      console.warn('[chat] loadUnreadCount failed', err);
    }
  },

  setUnreadTotal: (total) => set({ unreadTotal: total }),

  connect: async () => {
    if (get().hubRegistered) return;
    try {
      const conn = await getHubConnection();
      // Register handlers exactly once (singleton hub).
      // DO NOT call conn.start() anywhere inside these callbacks (Pitfall 2).
      conn.on('MessageReceived', (msg: MessageDto) => {
        get().appendMessage(msg);
      });
      conn.on('UnreadChanged', (payload: { total: number }) => {
        if (payload && typeof payload.total === 'number') {
          set({ unreadTotal: payload.total });
        }
      });
      conn.on('ConversationRead', (payload: { conversationId: number }) => {
        if (!payload) return;
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === payload.conversationId ? { ...c, unreadCount: 0 } : c
          ),
        }));
      });
      set({ hubRegistered: true });
    } catch (err) {
      console.warn('[chat] hub connect failed', err);
    }
  },
}));
