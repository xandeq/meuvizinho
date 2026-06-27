"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";

const CATEGORIES = [
  "Todos",
  "Alimentação",
  "Serviços",
  "Saúde",
  "Educação",
  "Tecnologia",
  "Comércio",
] as const;

interface BusinessItem {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  businessName: string | null;
  businessCategory: string | null;
  ratingAverage: number | null;
  ratingTotal: number;
}

function BriefcaseIcon() {
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
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function StarRow({ value, total }: { value: number | null; total: number }) {
  const rounded = Math.round(value ?? 0);
  return (
    <span className="flex items-center gap-1 text-sm">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= rounded ? "text-accent" : "text-border"}>
            ★
          </span>
        ))}
      </span>
      <span className="text-muted-fg text-xs">({total} avaliações)</span>
    </span>
  );
}

function AvatarCircle({
  photoUrl,
  name,
}: {
  photoUrl: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name[0] ?? "?").toUpperCase();

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="w-12 h-12 rounded-full object-cover border border-border/50 shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold shrink-0">
      {initial}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-full bg-muted" />
          <div className="h-3 w-20 rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-3 w-28 rounded-full bg-muted" />
    </div>
  );
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBusinesses = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "20" });
      if (category && category !== "Todos") params.set("category", category);
      const res = await fetch(`${API_BASE}/api/v1/businesses?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: BusinessItem[] | { items?: BusinessItem[] } = await res.json();
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setBusinesses(items);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBusinesses(selectedCategory);
  }, [selectedCategory, fetchBusinesses]);

  // Client-side search filter
  const filtered = debouncedSearch
    ? businesses.filter((b) => {
        const q = debouncedSearch.toLowerCase();
        return (
          (b.businessName ?? "").toLowerCase().includes(q) ||
          (b.displayName ?? "").toLowerCase().includes(q) ||
          (b.businessCategory ?? "").toLowerCase().includes(q)
        );
      })
    : businesses;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-primary">
            <BriefcaseIcon />
          </span>
          <h1 className="text-3xl font-extrabold text-fg leading-tight">
            Negócios Locais
          </h1>
        </div>
        <p className="text-muted-fg font-medium">
          Conheça os negócios do seu bairro
        </p>
      </header>

      {/* Search */}
      <input
        type="search"
        placeholder="Buscar negócios..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none transition-colors duration-150 focus:bg-card focus:border-primary font-medium"
      />

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={[
              "px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border",
              selectedCategory === cat
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-card text-muted-fg border-border/50 hover:border-primary/40 hover:text-fg",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-muted-fg font-medium">
            Nenhum negócio encontrado neste bairro ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((biz) => {
            const name = biz.businessName ?? biz.displayName ?? "Negócio";
            return (
              <Link
                key={biz.userId}
                href={`/business/${biz.userId}/`}
                className="block bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-3 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <AvatarCircle photoUrl={biz.photoUrl} name={name} />
                  <div className="min-w-0">
                    <p className="font-bold text-fg text-sm leading-tight truncate">
                      {name}
                    </p>
                    {biz.isVerified && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold mt-0.5">
                        <CheckIcon />
                        Verificado
                      </span>
                    )}
                  </div>
                </div>

                {/* Category chip */}
                {biz.businessCategory && (
                  <span className="inline-block bg-accent/15 text-accent rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {biz.businessCategory}
                  </span>
                )}

                {/* Stars */}
                <StarRow value={biz.ratingAverage} total={biz.ratingTotal} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
