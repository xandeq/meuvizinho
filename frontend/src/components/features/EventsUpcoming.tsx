"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UpcomingEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  groupId: number;
  groupName: string;
  attendingCount: number;
}

interface Props { bairroId: number | null; }

export default function EventsUpcoming({ bairroId }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bairroId || !token) { setLoading(false); return; }
    fetch(`${API}/api/v1/events/upcoming`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bairroId, token, API]);

  if (!loading && events.length === 0) return null; // hide widget if no events

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3 animate-slide-up">
      <div className="flex items-center gap-2">
        {/* calendar icon */}
        <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3 className="text-sm font-bold text-fg">Próximos eventos</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="h-12 rounded-xl animate-shimmer" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 4).map(ev => (
            <Link
              key={ev.id}
              href={`/groups/${ev.groupId}/`}
              className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted transition-colors"
            >
              {/* Date badge */}
              <div className="shrink-0 w-10 text-center bg-primary/10 rounded-lg py-1">
                <div className="text-[10px] font-semibold text-primary uppercase">
                  {format(new Date(ev.startsAt), "MMM", { locale: ptBR })}
                </div>
                <div className="text-base font-extrabold text-primary leading-none">
                  {format(new Date(ev.startsAt), "d")}
                </div>
              </div>
              {/* Info */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{ev.title}</p>
                <p className="text-xs text-muted-fg truncate">{ev.groupName}{ev.location ? ` · ${ev.location}` : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
