"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import ChatRoom from "@/components/features/chat/ChatRoom";
import { useChatStore } from "@/stores/chat-store";
import EmptyState from "@/components/ui/EmptyState";

export default function ChatRoomClient() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = Number(params?.conversationId);
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const connect = useChatStore((s) => s.connect);

  useEffect(() => {
    void connect();
    if (conversations.length === 0) void loadConversations();
  }, [connect, conversations.length, loadConversations]);

  const conversation =
    conversations.find((c) => c.id === conversationId) ?? null;

  if (!conversationId || Number.isNaN(conversationId)) {
    return <EmptyState title="Conversa inválida" description="Este link de conversa não existe." />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <ChatRoom
        conversationId={conversationId}
        conversation={conversation}
      />
    </div>
  );
}
