"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FeedHeader from "@/components/layouts/FeedHeader";
import PostCard from "@/components/features/PostCard";
import PostComposer from "@/components/features/PostComposer";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useFeedStore } from "@/stores/feed-store";
import { useAuthStore } from "@/lib/auth";

export default function FeedPage() {
  const router = useRouter();
  const items = useFeedStore((s) => s.items);
  const loading = useFeedStore((s) => s.loading);
  const hasMore = useFeedStore((s) => s.hasMore);
  const error = useFeedStore((s) => s.error);
  const loadFirst = useFeedStore((s) => s.loadFirst);
  const loadMore = useFeedStore((s) => s.loadMore);

  const [composerOpen, setComposerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // bairro guard + initial load
  useEffect(() => {
    const t = setTimeout(() => {
      const u = useAuthStore.getState().user;
      const bairroId = u?.bairroId ?? null;
      if (!bairroId) {
        router.replace("/cep-lookup/");
        return;
      }
      loadFirst(bairroId);
    }, 0);
    return () => clearTimeout(t);
  }, [router, loadFirst]);

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const u = useAuthStore.getState().user;
      const bairroId = u?.bairroId ?? null;
      if (!bairroId) return;
      if (entries[0]?.isIntersecting && hasMore && !loading) {
        loadMore(bairroId);
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

  return (
    <div className="space-y-4">
      <FeedHeader />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setComposerOpen(true)}
        >
          + Novo post
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-semibold">{error}</p>
      )}

      {items.length === 0 && !loading ? (
        <EmptyState
          title="Nenhum post ainda no seu bairro"
          description="Seja o primeiro a compartilhar uma novidade com a vizinhança."
          action={{ label: "Criar post", onClick: () => setComposerOpen(true) }}
        />
      ) : (
        <div className="space-y-4">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {loading && (
        <p className="text-center text-fg/60 font-medium">Carregando...</p>
      )}

      <div ref={sentinelRef} aria-hidden className="h-4" />

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}
