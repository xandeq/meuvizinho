"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NotificationDto, NotificationType } from "@bairronow/shared-types";
import { getHubConnection } from "@/lib/signalr";
import { useNotificationStore } from "@/stores/notification-store";

// ─── relative time helper ────────────────────────────────────────────────────
function relTime(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── notification body label ─────────────────────────────────────────────────
function notificationBody(n: NotificationDto): string {
  const who = n.actor.displayName ?? "Alguém";
  switch (n.type) {
    case "like":               return `${who} curtiu seu post`;
    case "comment":            return `${who} comentou no seu post`;
    case "reply":              return `${who} respondeu seu comentário`;
    case "mention":            return `${who} mencionou você`;
    case "GroupJoinApproved":  return "Sua entrada no grupo foi aprovada";
    case "NewRating":          return `${who} avaliou seu negócio`;
    case "GroupEvent":         return `${who} criou um evento no grupo`;
    case "listing_expired":    return "Seu anúncio expirou";
    case "price_drop":         return `Queda de preço em um anúncio favorito`;
    default:                   return `${who} interagiu com você`;
  }
}

// ─── notification link target ─────────────────────────────────────────────────
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

// ─── type → icon ─────────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: NotificationType | string }) {
  switch (type) {
    case "like":
      return (
        // heart
        <svg className="w-4 h-4 text-danger shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "comment":
      return (
        // chat-bubble
        <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "reply":
      return (
        // reply arrow
        <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      );
    case "mention":
      return (
        // at-sign
        <svg className="w-4 h-4 text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
        </svg>
      );
    case "GroupJoinApproved":
    case "group_join_approved":
      return (
        // check-circle
        <svg className="w-4 h-4 text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "NewRating":
    case "rating":
      return (
        // star
        <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "GroupEvent":
    case "group_event":
      return (
        // calendar
        <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "listing_expired":
      return (
        // clock
        <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "price_drop":
      return (
        // trending-down arrow
        <svg className="w-4 h-4 text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    default:
      return (
        // bell fallback
        <svg className="w-4 h-4 text-muted-fg shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

// ─── bell button icon ─────────────────────────────────────────────────────────
function BellIcon() {
  return (
    <svg
      className="w-[22px] h-[22px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const load = useNotificationStore((s) => s.load);
  const prepend = useNotificationStore((s) => s.prepend);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  // Load on mount + subscribe to SignalR
  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | null = null;

    void load();

    getHubConnection()
      .then((hub) => {
        if (!mounted) return;
        const handler = (dto: NotificationDto) => {
          if (mounted) prepend(dto);
        };
        hub.on("notification", handler);
        cleanup = () => {
          try {
            hub.off("notification", handler);
          } catch {
            // best-effort
          }
        };
      })
      .catch(() => {
        // best-effort — hub outages don't break the page
      });

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [load, prepend]);

  // Close on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const last10 = items.slice(0, 10);
  const displayCount = unread > 9 ? "9+" : unread;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${unread > 0 ? ` — ${unread} não lidas` : ""}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-fg hover:text-fg hover:bg-muted transition-all duration-200"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-danger text-white text-[9px] font-extrabold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 animate-badge-pop">
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 bg-card rounded-2xl border border-border/50 shadow-lg z-50 flex flex-col overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
            <p className="text-sm font-bold text-fg">Notificações</p>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {last10.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-fg">
                  Nenhuma notificação ainda.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {last10.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={notificationHref(n)}
                      onClick={() => {
                        void markRead(n.id);
                        setOpen(false);
                      }}
                      className={[
                        "flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors",
                        n.isRead
                          ? "bg-card"
                          : "bg-primary/5 border-l-2 border-primary",
                      ].join(" ")}
                    >
                      {/* Per-type icon */}
                      <div className="mt-0.5 shrink-0">
                        <TypeIcon type={n.type} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg leading-snug">
                          {notificationBody(n)}
                        </p>
                        <p className="text-xs text-muted-fg mt-0.5">
                          {relTime(n.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/50 shrink-0 flex items-center justify-between gap-2">
            <Link
              href="/notifications/"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todas
            </Link>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-muted-fg hover:text-fg hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
