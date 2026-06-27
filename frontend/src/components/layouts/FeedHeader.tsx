"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth";

export default function FeedHeader() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;
  const bairroName = user?.bairroName ?? `Bairro #${user?.bairroId ?? "?"}`;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-xs font-semibold text-muted-fg uppercase tracking-widest mb-0.5">
          Sua comunidade
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-fg">
          {bairroName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/feed/search/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm font-semibold text-muted-fg hover:text-fg hover:border-border-strong hover:bg-card transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden sm:inline">Buscar</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin/moderation/"
            className="px-3 py-2 rounded-xl text-sm font-semibold text-muted-fg hover:text-fg hover:bg-muted transition-colors"
          >
            Moderação
          </Link>
        )}
      </div>
    </div>
  );
}
