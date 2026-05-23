"use client";

import { useEffect } from "react";
import ConversationList from "@/components/features/chat/ConversationList";
import { useChatStore } from "@/stores/chat-store";

export default function ChatListPage() {
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const connect = useChatStore((s) => s.connect);
  const loading = useChatStore((s) => s.loading);

  useEffect(() => {
    void connect();
    void loadConversations();
  }, [connect, loadConversations]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-slide-up">
      <header>
        <h1 className="text-3xl font-extrabold text-fg">Mensagens</h1>
        <p className="text-fg/60 font-medium">Suas conversas com vizinhos</p>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-bg border-2 border-border rounded-lg animate-pulse">
              <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ConversationList conversations={conversations} />
      )}
    </div>
  );
}
