"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostDto } from "@bairronow/shared-types";
import FeedHeader from "@/components/layouts/FeedHeader";
import PostCard from "@/components/features/PostCard";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { feedClient } from "@/lib/feed";
import { useAuthStore } from "@/lib/auth";
import type { ConversationDto } from "@/lib/types/marketplace";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";

type Tab = "posts" | "users" | "listings";

interface UserResult {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessName: string | null;
  businessCategory: string | null;
}

interface ListingResult {
  id: string;
  title: string;
  price: number;
  createdAt: string;
  sellerName: string;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ShimmerRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded-full w-2/5" />
            <div className="h-3 bg-muted rounded-full w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function SearchPage() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [postResults, setPostResults] = useState<PostDto[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [listingResults, setListingResults] = useState<ListingResult[]>([]);

  const [searched, setSearched] = useState(false);
  const [sendingDmFor, setSendingDmFor] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = async (recipientId: string) => {
    if (!token) { router.push("/login"); return; }
    setSendingDmFor(recipientId);
    try {
      const res = await fetch(`${API}/api/v1/users/${recipientId}/conversation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const conv: ConversationDto = await res.json();
      router.push(`/chat/${conv.id}/`);
    } catch {
      // best-effort
    } finally {
      setSendingDmFor(null);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setSearched(false);
      setPostResults([]);
      setUserResults([]);
      setListingResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(q.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeTab]);

  async function runSearch(query: string) {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "posts") {
        const res = await feedClient.search({ q: query, take: 20 });
        setPostResults(res.items);
      } else if (activeTab === "users") {
        const res = await fetch(
          `${API}/api/v1/search/users?q=${encodeURIComponent(query)}&take=20`,
          { headers: { Authorization: `Bearer ${token ?? ""}` } }
        );
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json() as { items: UserResult[]; total: number };
        setUserResults(data.items);
      } else {
        const res = await fetch(
          `${API}/api/v1/search/listings?q=${encodeURIComponent(query)}&take=20`,
          { headers: { Authorization: `Bearer ${token ?? ""}` } }
        );
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json() as { items: ListingResult[]; total: number };
        setListingResults(data.items);
      }
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      setLoading(false);
    }
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearched(false);
    setPostResults([]);
    setUserResults([]);
    setListingResults([]);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "posts", label: "Posts" },
    { id: "users", label: "Usuários" },
    { id: "listings", label: "Anúncios" },
  ];

  const isEmpty =
    searched &&
    !loading &&
    ((activeTab === "posts" && postResults.length === 0) ||
      (activeTab === "users" && userResults.length === 0) ||
      (activeTab === "listings" && listingResults.length === 0));

  return (
    <div className="space-y-4">
      <FeedHeader />
      <h1 className="text-2xl font-extrabold text-fg">Buscar no bairro</h1>

      {/* Search input */}
      <div className="bg-card rounded-2xl border border-border/70 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="dica, alerta, evento, negócio..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted text-sm text-fg placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card rounded-2xl border border-border/70 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={
              activeTab === tab.id
                ? "bg-primary text-white rounded-full px-4 py-1.5 text-sm font-semibold"
                : "text-muted-fg px-4 py-1.5 text-sm font-semibold hover:text-fg"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="bg-card rounded-2xl border border-border/70 p-4 min-h-[120px]">
        {/* Empty query state */}
        {!q.trim() && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-fg">
            <SearchIcon className="w-8 h-8 opacity-40" />
            <p className="text-sm font-semibold">Digite para buscar...</p>
          </div>
        )}

        {/* Loading shimmer */}
        {loading && <ShimmerRows count={3} />}

        {/* Error */}
        {error && !loading && (
          <p className="text-sm text-danger font-semibold py-4 text-center">{error}</p>
        )}

        {/* No results */}
        {isEmpty && !error && (
          <p className="text-sm text-muted-fg font-semibold py-4 text-center">
            Nenhum resultado para &ldquo;{q}&rdquo;
          </p>
        )}

        {/* Posts results */}
        {!loading && activeTab === "posts" && postResults.length > 0 && (
          <div className="space-y-4">
            {postResults.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Users results */}
        {!loading && activeTab === "users" && userResults.length > 0 && (
          <ul className="space-y-3">
            {userResults.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <Link href={`/business/${user.id}/`} className="shrink-0">
                  <Avatar
                    src={user.photoUrl}
                    name={user.displayName}
                    size="md"
                    verified={user.isVerified}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/business/${user.id}/`} className="block hover:opacity-80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-fg truncate">
                        {user.displayName ?? "Vizinho"}
                      </span>
                      {user.isVerified && (
                        <Badge variant="verified" size="sm" dot>
                          Verificado
                        </Badge>
                      )}
                    </div>
                    {user.isBusinessAccount && (
                      <p className="text-xs text-accent font-semibold mt-0.5 truncate">
                        {user.businessName ?? user.businessCategory ?? "Negócio local"}
                      </p>
                    )}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => handleMessage(user.id)}
                  disabled={sendingDmFor === user.id}
                  className="shrink-0 px-3 py-1.5 rounded-full border-2 border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-white disabled:opacity-60 transition-colors"
                >
                  {sendingDmFor === user.id ? "..." : "Mensagem"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Listings results */}
        {!loading && activeTab === "listings" && listingResults.length > 0 && (
          <ul className="divide-y divide-border/50">
            {listingResults.map((listing) => (
              <li key={listing.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/marketplace/listing/?id=${listing.id}`}
                  className="flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg truncate">{listing.title}</p>
                    <p className="text-xs text-muted-fg mt-0.5 truncate">
                      por {listing.sellerName}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-primary whitespace-nowrap">
                    {formatPrice(listing.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
