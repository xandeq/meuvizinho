"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PostDto, CommentDto } from "@bairronow/shared-types";
import FeedHeader from "@/components/layouts/FeedHeader";
import PostCard from "@/components/features/PostCard";
import CommentThread from "@/components/features/CommentThread";
import { feedClient } from "@/lib/feed";

function PostDetailContent() {
  const params = useSearchParams();
  const idParam = params?.get("id") ?? "";
  const id = Number(idParam);

  const [post, setPost] = useState<PostDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = await feedClient.getPost(id);
        if (!mounted) return;
        setPost(data);
        setComments(data.comments ?? []);
      } catch (e: unknown) {
        const status =
          (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) setNotFound(true);
        else
          setError(e instanceof Error ? e.message : "Erro ao carregar post");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <FeedHeader />
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-32" />
                <div className="h-2.5 bg-muted rounded w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
            </div>
          </div>
        </div>
      )}
      {notFound && (
        <p className="text-fg/70 font-semibold">Post não encontrado.</p>
      )}
      {error && <p className="text-red-600 font-semibold">{error}</p>}
      {post && (
        <>
          <PostCard post={post} linkToDetail={false} />
          <CommentThread postId={post.id} initial={comments} />
        </>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 animate-pulse p-4">
        <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-32" />
              <div className="h-2.5 bg-muted rounded w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    }>
      <PostDetailContent />
    </Suspense>
  );
}
