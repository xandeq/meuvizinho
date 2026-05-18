"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";

interface EventItem {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  groupId: number;
  groupName: string;
  attendingCount: number;
  isCallerAttending: boolean;
}

function CalendarIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0 text-muted-fg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0 text-muted-fg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 flex gap-4 animate-pulse">
      <div className="w-12 h-14 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 w-48 rounded-full bg-muted" />
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="h-3 w-20 rounded-full bg-muted" />
      </div>
      <div className="w-24 h-9 rounded-xl bg-muted shrink-0 self-center" />
    </div>
  );
}

interface EventCardProps {
  event: EventItem;
  token: string;
  onRsvpChange: (id: number, attending: boolean, newCount: number) => void;
}

function EventCard({ event, token, onRsvpChange }: EventCardProps) {
  const [submitting, setSubmitting] = useState(false);

  const dayNum = format(new Date(event.startsAt), "d");
  const monthAbbr = format(new Date(event.startsAt), "MMM", { locale: ptBR });

  const handleRsvp = async () => {
    if (submitting) return;
    const newAttending = !event.isCallerAttending;
    // Optimistic update
    onRsvpChange(
      event.id,
      newAttending,
      event.attendingCount + (newAttending ? 1 : -1)
    );
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/v1/events/${event.id}/rsvp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attending: newAttending }),
      });
    } catch {
      // Revert on failure
      onRsvpChange(
        event.id,
        !newAttending,
        event.attendingCount
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 flex gap-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      {/* Date badge */}
      <div className="shrink-0 w-12 text-center bg-primary/10 rounded-xl py-1.5 px-1 self-start">
        <div className="text-[10px] font-semibold text-primary uppercase tracking-wide">
          {monthAbbr}
        </div>
        <div className="text-xl font-extrabold text-primary leading-none mt-0.5">
          {dayNum}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-bold text-fg leading-tight line-clamp-2">
          {event.title}
        </p>
        <p className="text-xs text-muted-fg font-medium truncate">
          {event.groupName}
        </p>
        {event.location && (
          <div className="flex items-center gap-1">
            <MapPinIcon />
            <span className="text-xs text-muted-fg truncate">{event.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <UsersIcon />
          <span className="text-xs text-muted-fg">
            {event.attendingCount} confirmados
          </span>
        </div>
      </div>

      {/* RSVP button */}
      <div className="shrink-0 self-center">
        <button
          type="button"
          onClick={handleRsvp}
          disabled={submitting}
          className={[
            "px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            event.isCallerAttending
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-muted text-fg border border-border hover:border-primary/40 hover:text-primary",
          ].join(" ")}
        >
          {event.isCallerAttending ? "Vou! ✓" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}

type TabType = "upcoming" | "past";

export default function EventsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("upcoming");

  const fetchEvents = useCallback(
    async (upcoming: boolean) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          upcoming: upcoming ? "true" : "false",
          pageSize: "20",
        });
        const res = await fetch(`${API_BASE}/api/v1/events?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("fetch failed");
        const data: EventItem[] | { items?: EventItem[] } = await res.json();
        const items = Array.isArray(data) ? data : (data.items ?? []);
        setEvents(items);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void fetchEvents(tab === "upcoming");
  }, [tab, fetchEvents]);

  const handleRsvpChange = (
    id: number,
    attending: boolean,
    newCount: number
  ) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === id
          ? { ...ev, isCallerAttending: attending, attendingCount: newCount }
          : ev
      )
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-primary">
            <CalendarIcon />
          </span>
          <h1 className="text-3xl font-extrabold text-fg leading-tight">
            Eventos do Bairro
          </h1>
        </div>
        <p className="text-muted-fg font-medium">
          Próximos eventos na sua comunidade
        </p>
      </header>

      {/* Tab toggle */}
      <div className="inline-flex bg-muted rounded-xl p-1 gap-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              tab === t
                ? "bg-card text-primary shadow-xs"
                : "text-muted-fg hover:text-fg",
            ].join(" ")}
          >
            {t === "upcoming" ? "Próximos" : "Passados"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-fg font-medium">
            {tab === "upcoming"
              ? "Sem eventos próximos no seu bairro."
              : "Nenhum evento passado encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              token={token ?? ""}
              onRsvpChange={handleRsvpChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
