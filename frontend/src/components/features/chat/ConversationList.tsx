"use client";

import { useState } from "react";
import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { ConversationDto } from "@/lib/types/marketplace";

export interface ConversationListProps {
  conversations: ConversationDto[];
}

function UserAvatar({ name, photoUrl }: { name: string | null; photoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name ?? "Usuário"}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-extrabold text-base flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
}

export default function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <svg className="w-7 h-7 text-muted-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-fg">Nenhuma conversa ainda</p>
          <p className="text-sm text-muted-fg mt-0.5">
            Abra um anúncio ou perfil de negócio e inicie um chat.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime()
  );

  return (
    <ul className="space-y-2">
      {sorted.map((c) => {
        const isDirect = c.listingId == null;
        return (
          <li key={c.id}>
            <Link
              href={`/chat/${c.id}/`}
              className="flex items-center gap-3 p-4 bg-card border border-border/50 shadow-sm rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20"
            >
              {isDirect ? (
                <UserAvatar name={c.otherUserDisplayName} photoUrl={c.otherUserPhotoUrl} />
              ) : c.listingThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.listingThumbnailUrl}
                  alt={c.listingTitle ?? "Anúncio"}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-fg truncate text-sm">
                    {isDirect
                      ? (c.otherUserDisplayName ?? "Vizinho")
                      : (c.listingTitle ?? "Anúncio")}
                  </span>
                  {c.otherUserIsVerified && <VerifiedBadge verified size="sm" />}
                </div>
                {!isDirect && (
                  <p className="text-xs text-muted-fg font-medium truncate mt-0.5">
                    {c.otherUserDisplayName ?? "Vizinho"}
                  </p>
                )}
              </div>
              {c.unreadCount > 0 && (
                <span className="bg-danger text-white text-xs font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0">
                  {c.unreadCount > 99 ? "99+" : c.unreadCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
