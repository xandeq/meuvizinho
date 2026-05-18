"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PostDto } from "@bairronow/shared-types";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import LikeButton from "./LikeButton";
import ReportDialog from "./ReportDialog";
import { useAuthStore } from "@/lib/auth";
import { feedClient } from "@/lib/feed";
import { useFeedStore } from "@/stores/feed-store";

interface PostCardProps {
  post: PostDto;
  onLikeChange?: (liked: boolean, count: number) => void;
  onDelete?: (id: number) => void;
  linkToDetail?: boolean;
}

const categoryMap: Record<string, { variant: "primary" | "secondary" | "accent" | "danger" | "muted" }> = {
  Dica:     { variant: "secondary" },
  Alerta:   { variant: "danger"    },
  Pergunta: { variant: "primary"   },
  Evento:   { variant: "accent"    },
  Geral:    { variant: "muted"     },
};

function CommentIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

const imageGridClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2",
};

export default function PostCard({
  post,
  onLikeChange,
  onDelete,
  linkToDetail = true,
}: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const removePost = useFeedStore((s) => s.removePost);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwner = user?.id === post.author.id;
  const cat = categoryMap[post.category] ?? categoryMap.Geral;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    locale: ptBR,
    addSuffix: true,
  });

  const handleDelete = async () => {
    if (!confirm("Excluir este post?")) return;
    setBusy(true);
    try {
      await feedClient.deletePost(post.id);
      removePost(post.id);
      onDelete?.(post.id);
    } finally {
      setBusy(false);
    }
  };

  const gridCols = imageGridClass[Math.min(post.images.length, 4)] ?? "grid-cols-2";

  return (
    <article className="bg-card rounded-2xl border border-border/70 overflow-hidden transition-all duration-200 hover:border-border-strong hover:shadow-sm animate-slide-up hover-lift">
      <div className="p-5">
        {/* Header */}
        <header className="flex items-start gap-3 mb-4">
          <Avatar
            src={post.author.photoUrl}
            name={post.author.displayName}
            size="md"
            verified={post.author.isVerified}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm text-fg truncate">
                {post.author.displayName ?? "Vizinho"}
              </p>
              {post.author.isVerified && (
                <Badge variant="verified" size="sm" dot>
                  Verificado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-fg mt-0.5">
              {timeAgo}
              {post.isEdited && (
                <span className="ml-1 opacity-60">&bull; Editado</span>
              )}
            </p>
            {post.author.isBusinessAccount && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-semibold tracking-wide">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  {post.author.businessName ?? post.author.businessCategory ?? "Negócio local"}
                </span>
              </div>
            )}
          </div>
          <Badge variant={cat.variant} size="sm">
            {post.category}
          </Badge>
        </header>

        {/* Body */}
        <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap mb-4">
          {post.body}
        </p>
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div className={`grid ${gridCols} gap-0.5`}>
          {post.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img.url}
              alt={`Imagem ${i + 1}`}
              className="w-full h-48 object-cover"
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 flex items-center gap-1 transition-all duration-200">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByMe}
          initialCount={post.likeCount}
          onChange={onLikeChange}
        />

        {linkToDetail ? (
          <Link
            href={`/feed/post/?id=${post.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-fg hover:text-primary hover:bg-primary-light transition-all duration-200 active:scale-95"
            aria-label="Ver comentários"
          >
            <CommentIcon />
            <span>{post.commentCount}</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-fg">
            <CommentIcon />
            <span>{post.commentCount}</span>
          </span>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-fg hover:text-danger hover:bg-danger-light transition-all duration-200 active:scale-95"
        >
          <FlagIcon />
          <span className="hidden sm:inline">Denunciar</span>
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-fg hover:text-danger hover:bg-danger-light transition-all duration-200 active:scale-95 disabled:opacity-40"
          >
            <TrashIcon />
            <span className="hidden sm:inline">Excluir</span>
          </button>
        )}
      </div>

      {post.author.isBusinessAccount && (
        <div className="px-5 pb-4">
          <div className="pt-3 border-t border-border/50 mt-1">
            <Link
              href={`/business/${post.author.id}/`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Ver perfil do negócio
            </Link>
          </div>
        </div>
      )}

      <ReportDialog
        targetType="post"
        targetId={post.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </article>
  );
}
