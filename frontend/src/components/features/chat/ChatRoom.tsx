"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/lib/auth";
import { useSignalRChat } from "@/hooks/useSignalRChat";
import { getMessageHistory } from "@/lib/api/chat";
import type { ConversationDto } from "@/lib/types/marketplace";

function UserPhotoAvatar({ photoUrl, displayName }: { photoUrl: string | null | undefined; displayName: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const initial = ((displayName ?? "?")[0] ?? "?").toUpperCase();
  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={displayName ?? "Usuário"}
        className="w-12 h-12 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-extrabold text-base flex items-center justify-center shrink-0">
      {initial}
    </div>
  );
}

export interface ChatRoomProps {
  conversationId: number;
  conversation?: ConversationDto | null;
}

export default function ChatRoom({
  conversationId,
  conversation,
}: ChatRoomProps) {
  const user = useAuthStore((s) => s.user);
  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] ?? []
  );
  const setMessages = useChatStore((s) => s.setMessages);
  const prependHistory = useChatStore((s) => s.prependHistory);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Join the SignalR group for this conversation (reuses shared hub).
  useSignalRChat(conversationId);

  // Load initial history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const msgs = await getMessageHistory(conversationId);
        if (!cancelled) {
          setMessages(conversationId, msgs);
          void markRead(conversationId);
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, setMessages, markRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const older = await getMessageHistory(conversationId, oldest.sentAt);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        prependHistory(conversationId, older);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, messages, loadingMore, hasMore, prependHistory]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 40 && hasMore && !loadingMore) {
      void loadOlder();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden">
      {conversation && (
        conversation.listingId != null ? (
          <Link
            href={`/marketplace/${conversation.listingId}/`}
            className="flex items-center gap-3 p-3 border-b border-border/50 hover:bg-muted transition-colors"
          >
            {conversation.listingThumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.listingThumbnailUrl}
                alt={conversation.listingTitle ?? "Anúncio"}
                className="w-12 h-12 rounded object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-fg truncate">
                {conversation.listingTitle ?? "Anúncio"}
              </p>
              <p className="text-xs text-fg/60 font-medium truncate">
                com {conversation.otherUserDisplayName ?? "Vizinho"}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href={`/business/${conversation.otherUserId}/`}
            className="flex items-center gap-3 p-3 border-b border-border/50 hover:bg-muted transition-colors"
          >
            <UserPhotoAvatar photoUrl={conversation.otherUserPhotoUrl} displayName={conversation.otherUserDisplayName} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-fg truncate">
                {conversation.otherUserDisplayName ?? "Vizinho"}
              </p>
              <p className="text-xs text-fg/60 font-medium">Mensagem direta</p>
            </div>
          </Link>
        )
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-3"
      >
        {loadingMore && (
          <p className="text-center text-xs text-fg/50 mb-2">
            Carregando...
          </p>
        )}
        {messages.length === 0 ? (
          <p className="text-center text-fg/60 font-medium mt-8">
            Nenhuma mensagem ainda. Diga olá!
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.senderId === user?.id}
            />
          ))
        )}
      </div>

      {sendError && (
        <p className="text-xs text-danger font-semibold text-center py-1 bg-danger-light">
          {sendError}
        </p>
      )}
      <MessageComposer
        onSend={async (text, image) => {
          setSendError(null);
          try {
            await sendMessage(conversationId, text, image);
          } catch {
            setSendError("Falha ao enviar. Tente novamente.");
            throw new Error("send failed");
          }
        }}
      />
    </div>
  );
}
