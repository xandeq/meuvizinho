"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificationDto } from "@bairronow/shared-types";
import { getHubConnection } from "@/lib/signalr";
import { useNotificationStore } from "@/stores/notification-store";

function notificationLabel(n: NotificationDto): string {
  const who = n.actor.displayName ?? "Alguém";
  switch (n.type) {
    case "comment":  return `${who} comentou no seu post`;
    case "reply":    return `${who} respondeu seu comentário`;
    case "like":     return `${who} curtiu seu post`;
    case "mention":  return `${who} mencionou você`;
    default:         return `${who} interagiu com você`;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const load = useNotificationStore((s) => s.load);
  const prepend = useNotificationStore((s) => s.prepend);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | null = null;
    load();
    getHubConnection()
      .then((hub) => {
        if (!mounted) return;
        const handler = (dto: NotificationDto) => { if (mounted) prepend(dto); };
        hub.on("notification", handler);
        cleanup = () => { try { hub.off("notification", handler); } catch { /* best-effort */ } };
      })
      .catch(() => { /* best-effort */ });
    return () => { mounted = false; if (cleanup) cleanup(); };
  }, [load, prepend]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const last10 = items.slice(0, 10);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${unread > 0 ? ` — ${unread} não lidas` : ""}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-fg hover:text-fg hover:bg-muted transition-all duration-200"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-danger text-white text-[9px] font-extrabold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 animate-badge-pop">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl border border-border shadow-lg z-50 overflow-hidden animate-fade-up">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-fg">Notificações</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Marcar tudo lido
              </button>
            )}
          </div>

          {last10.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-fg">Nenhuma notificação ainda.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border/60">
              {last10.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.postId ? `/feed/post/?id=${n.postId}` : "/feed/"}
                    onClick={() => { void markRead(n.id); setOpen(false); }}
                    className={[
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors",
                      n.isRead ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <div className={[
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      n.isRead ? "bg-border" : "bg-primary",
                    ].join(" ")} />
                    <div className="flex-1 min-w-0">
                      <p className={["text-sm leading-snug", n.isRead ? "text-muted-fg" : "text-fg font-semibold"].join(" ")}>
                        {notificationLabel(n)}
                      </p>
                      <p className="text-xs text-muted-fg mt-0.5">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
