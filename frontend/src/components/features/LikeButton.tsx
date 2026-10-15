"use client";

import { useState } from "react";
import { feedClient } from "@/lib/feed";
import { useFeedStore } from "@/stores/feed-store";

interface LikeButtonProps {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  onChange?: (liked: boolean, count: number) => void;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-4 h-4 transition-transform duration-150"
      style={{ transform: filled ? "scale(1.15)" : "scale(1)" }}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
  onChange,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const setStoreLiked = useFeedStore((s) => s.setLiked);

  const handleClick = async () => {
    if (busy) return;
    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !prevLiked;
    const nextCount = prevCount + (nextLiked ? 1 : -1);

    setLiked(nextLiked);
    setCount(nextCount);
    setStoreLiked(postId, nextLiked, nextCount);
    onChange?.(nextLiked, nextCount);

    setBusy(true);
    try {
      const res = await feedClient.toggleLike(postId);
      setLiked(res.liked);
      setCount(res.count);
      setStoreLiked(postId, res.liked, res.count);
      onChange?.(res.liked, res.count);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      setStoreLiked(postId, prevLiked, prevCount);
      onChange?.(prevLiked, prevCount);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={liked}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl",
        "text-xs font-semibold transition-all duration-200 active:scale-90",
        liked
          ? "text-danger bg-danger-light hover:bg-danger-light/80"
          : "text-muted-fg hover:text-fg hover:bg-muted",
        busy ? "opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <HeartIcon filled={liked} />
      <span className="sr-only">{liked ? "Descurtir" : "Curtir"}, </span>
      <span>{count}</span>
      <span className="sr-only"> {count === 1 ? "curtida" : "curtidas"}</span>
    </button>
  );
}
