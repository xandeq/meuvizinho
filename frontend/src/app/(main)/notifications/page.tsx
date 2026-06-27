"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NotificationDto, NotificationType } from "@bairronow/shared-types";
import { useNotificationStore } from "@/stores/notification-store";

// ─── relative time ───────────────────────────────────────────────────────────
function relTime(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return new Date(date).toLocaleDateString("pt-BR");
}

// ─── notification label ──────────────────────────────────────────────────────
function notificationBody(n: NotificationDto): string {
  const who = n.actor.displayName ?? "Alguém";
  switch (n.type) {
    case "like":              return `${who} curtiu seu post`;
    case "comment":           return `${who} comentou no seu post`;
    case "reply":             return `${who} respondeu seu comentário`;
    case "mention":           return `${who} mencionou você`;
    case "GroupJoinApproved": return "Sua entrada no grupo foi aprovada";
    case "NewRating":         return `${who} avaliou seu negócio`;
    case "GroupEvent":        return `${who} criou um evento no grupo`;
    case "listing_expired":   return "Seu anúncio expirou";
    case "price_drop":        return "Queda de preço em um anúncio favorito";
    default:                  return `${who} interagiu com você`;
  }
}

// ─── notification link ───────────────────────────────────────────────────────
function notificationHref(n: NotificationDto): string {
  switch (n.type) {
    case "listing_expired":
    case "price_drop":
      return n.postId ? `/marketplace/${n.postId}/` : "/marketplace/";
    case "GroupJoinApproved":
    case "GroupEvent":
      return n.groupId ? `/groups/${n.groupId}/` : "/groups/";
    case "NewRating":
      return "/profile/";
    default:
      return n.postId ? `/feed/post/?id=${n.postId}` : "/feed/";
  }
}

// ─── per-type icon ───────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: NotificationType | string }) {
  const base = "w-5 h-5 shrink-0";
  switch (type) {
    case "like":
      return (
        <svg className={`${base} text-danger`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "comment":
      return (
        <svg className={`${base} text-primary`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "reply":
      return (
        <svg className={`${base} text-accent`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      );
    case "mention":
      return (
        <svg className={`${base} text-secondary`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
        </svg>
      );
    case "GroupJoinApproved":
      return (
        <svg className={`${base} text-secondary`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "NewRating":
      return (
        <svg className={`${base} text-accent`} viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "GroupEvent":
      return (
        <svg className={`${base} text-primary`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "listing_expired":
      return (
        <svg className={`${base} text-muted-fg`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "price_drop":
      return (
        <svg className={`${base} text-secondary`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    default:
      return (
        <svg className={`${base} text-muted-fg`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

// ─── actor avatar ────────────────────────────────────────────────────────────
function ActorAvatar({ actor }: { actor: NotificationDto["actor"] }) {
  const [failed, setFailed] = useState(false);
  const initial = ((actor.displayName ?? "?")[0] ?? "?").toUpperCase();
  if (actor.photoUrl && !failed) {
    return (
      <img
        src={actor.photoUrl}
        alt={actor.displayName ?? "Usuário"}
        className="w-10 h-10 rounded-full object-cover shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-extrabold flex items-center justify-center shrink-0 text-sm">
      {initial}
    </div>
  );
}

// ─── skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const loading = useNotificationStore((s) => s.loading);
  const load = useNotificationStore((s) => s.load);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-fg">Notificações</h1>
          {unread > 0 && (
            <p className="text-sm text-muted-fg mt-0.5">
              {unread} não {unread === 1 ? "lida" : "lidas"}
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {loading && items.length === 0 ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-light border border-primary-mid/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-base font-semibold text-fg">Tudo em ordem</p>
            <p className="text-sm text-muted-fg mt-1">Nenhuma notificação ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={notificationHref(n)}
                  onClick={() => { void markRead(n.id); }}
                  className={[
                    "flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors",
                    n.isRead ? "" : "bg-primary/5 border-l-2 border-primary",
                  ].join(" ")}
                >
                  <ActorAvatar actor={n.actor} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg leading-snug">
                      {notificationBody(n)}
                    </p>
                    <p className="text-xs text-muted-fg mt-0.5">
                      {relTime(n.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <TypeIcon type={n.type} />
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary" aria-label="Não lida" />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
