"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MessageDto } from "@/lib/types/marketplace";

export interface MessageBubbleProps {
  message: MessageDto;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
      data-testid={`message-${message.id}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 ${
          isOwn
            ? "bg-primary text-white rounded-br-sm"
            : "bg-muted text-fg rounded-bl-sm"
        }`}
      >
        {message.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt="Imagem"
            className="rounded-lg mb-1 max-w-full h-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.text}
          </p>
        )}
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-white/70" : "text-fg/50"
          }`}
        >
          {formatDistanceToNow(new Date(message.sentAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
    </div>
  );
}
