"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FeedHeader from "@/components/layouts/FeedHeader";
import PostCard from "@/components/features/PostCard";
import PostComposer from "@/components/features/PostComposer";
import EmptyState from "@/components/ui/EmptyState";
import { useFeedStore } from "@/stores/feed-store";
import { useAuthStore } from "@/lib/auth";
import { getPins } from "@/lib/api/map";
import type { MapPin } from "@/lib/types/map";
import EventsUpcoming from "@/components/features/EventsUpcoming";

function PlusIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full animate-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded-full animate-shimmer" />
          <div className="h-2.5 w-20 rounded-full animate-shimmer" />
        </div>
        <div className="h-5 w-16 rounded-full animate-shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full animate-shimmer" />
        <div className="h-3 w-4/5 rounded-full animate-shimmer" />
        <div className="h-3 w-2/3 rounded-full animate-shimmer" />
      </div>
      <div className="flex gap-3 pt-2 border-t border-border/60">
        <div className="h-7 w-16 rounded-xl animate-shimmer" />
        <div className="h-7 w-16 rounded-xl animate-shimmer" />
      </div>
    </div>
  );
}

function BusinessAvatarCircle({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
      {initials || "N"}
    </div>
  );
}

function BusinessSpotlight({ bairroId }: { bairroId: number }) {
  const [businesses, setBusinesses] = useState<MapPin[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPins(bairroId, "businesses")
      .then((pins) => {
        if (!mounted) return;
        setBusinesses(pins.filter((p) => p.isBusinessAccount).slice(0, 4));
      })
      .catch(() => {
        if (mounted) setBusinesses([]);
      })
      .finally(() => {
        if (mounted) setSpotlightLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [bairroId]);

  if (!spotlightLoading && businesses.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent">
          <StoreIcon />
        </span>
        <h2 className="text-sm font-bold text-fg">Negocios do Bairro</h2>
      </div>

      {spotlightLoading ? (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 animate-shimmer">
              <div className="w-6 h-6 rounded-full bg-muted" />
              <div className="w-16 h-3 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {businesses.map((biz) => (
            <Link
              key={biz.userId}
              href={`/business/${biz.userId}/`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 bg-muted hover:border-accent/50 hover:bg-accent/5 transition-colors duration-150"
            >
              <BusinessAvatarCircle name={biz.displayName ?? "N"} />
              <span className="text-xs font-semibold text-fg truncate max-w-[100px]">
                {biz.displayName ?? "Negocio"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const items = useFeedStore((s) => s.items);
  const loading = useFeedStore((s) => s.loading);
  const hasMore = useFeedStore((s) => s.hasMore);
  const error = useFeedStore((s) => s.error);
  const loadFirst = useFeedStore((s) => s.loadFirst);
  const loadMore = useFeedStore((s) => s.loadMore);

  const [composerOpen, setComposerOpen] = useState(false);
  const [bairroId, setBairroId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const u = useAuthStore.getState().user;
      const id = u?.bairroId ?? null;
      if (!id) {
        router.replace("/cep-lookup/");
        return;
      }
      setBairroId(id);
      loadFirst(id);
    }, 0);
    return () => clearTimeout(t);
  }, [router, loadFirst]);

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const u = useAuthStore.getState().user;
      const id = u?.bairroId ?? null;
      if (!id) return;
      if (entries[0]?.isIntersecting && hasMore && !loading) {
        loadMore(id);
      }
    },
    [hasMore, loading, loadMore]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(onIntersect, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onIntersect]);

  const initialLoading = loading && items.length === 0;

  return (
    <div className="max-w-2xl mx-auto">
      <FeedHeader />

      {bairroId !== null && <BusinessSpotlight bairroId={bairroId} />}

      <EventsUpcoming bairroId={bairroId} />

      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-danger-light border border-danger/20 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {initialLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum post ainda no seu bairro"
          description="Seja o primeiro a compartilhar uma novidade com a vizinhanca."
          action={{ label: "Criar post", onClick: () => setComposerOpen(true) }}
        />
      ) : (
        <div className="space-y-4">
          {items.map((post, i) => (
            <div
              key={post.id}
              className={`stagger-slide-${Math.min((i % 5) + 1, 5)}`}
            >
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="flex justify-center py-8">
          <div
            className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
            style={{ animation: "spin-smooth 0.7s linear infinite" }}
          />
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-4" />

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-6 z-30 w-14 h-14 bg-primary text-white rounded-2xl shadow-blue flex items-center justify-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        aria-label="Novo post"
        style={{ boxShadow: "0 4px 20px rgba(37,99,235,0.35), 0 2px 6px rgba(37,99,235,0.15)" }}
      >
        <PlusIcon />
      </button>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}
