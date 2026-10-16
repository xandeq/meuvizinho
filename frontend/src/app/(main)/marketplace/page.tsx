"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/features/marketplace/ListingCard";
import FilterChips from "@/components/features/marketplace/FilterChips";
import { useMarketplaceStore } from "@/stores/marketplace-store";
import { useAuthStore } from "@/lib/auth";
import { listListings, searchListings } from "@/lib/api/marketplace";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function MarketplacePage() {
  const user = useAuthStore((s) => s.user);
  const items = useMarketplaceStore((s) => s.items);
  const cursor = useMarketplaceStore((s) => s.cursor);
  const hasMore = useMarketplaceStore((s) => s.hasMore);
  const loading = useMarketplaceStore((s) => s.loading);
  const filters = useMarketplaceStore((s) => s.filters);
  const setFilters = useMarketplaceStore((s) => s.setFilters);
  const append = useMarketplaceStore((s) => s.append);
  const setLoading = useMarketplaceStore((s) => s.setLoading);
  const reset = useMarketplaceStore((s) => s.reset);

  const [searchText, setSearchText] = useState("");

  const bairroId = user?.bairroId ?? null;

  const loadPage = useCallback(
    async (resetItems = false) => {
      if (!bairroId) return;
      setLoading(true);
      try {
        const common = {
          bairroId,
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          verifiedOnly: filters.verifiedOnly,
        };
        const page = filters.q
          ? await searchListings({ ...common, q: filters.q })
          : await listListings({
              ...common,
              sort: filters.sort,
              cursor: resetItems ? null : cursor,
            });
        append(page.items, page.nextCursor);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    },
    [bairroId, filters, cursor, append, setLoading]
  );

  // Initial load + filter change
  useEffect(() => {
    if (!bairroId) return;
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bairroId, filters]);

  // Reset store when unmounting to avoid stale cache across sessions
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ q: searchText.trim() || undefined });
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-fg">Marketplace</h1>
          <p className="text-fg/60 font-medium">
            Compre e venda no seu bairro
          </p>
        </div>
        {user?.isVerified ? (
          <Link
            href="/marketplace/new/"
            className="bg-primary text-white font-extrabold px-4 py-2 rounded-lg"
          >
            + Novo anúncio
          </Link>
        ) : (
          <Link
            href="/profile/"
            className="border border-accent/50 text-accent font-semibold px-4 py-2 rounded-xl text-sm bg-accent/5"
          >
            Verifique seu endereço
          </Link>
        )}
      </header>

      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <Input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar no marketplace..."
        />
        <Button type="submit" size="sm">
          Buscar
        </Button>
      </form>

      <FilterChips filters={filters} onChange={setFilters} />

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 p-3 space-y-2 animate-pulse">
              <div className="aspect-square bg-muted rounded-xl" />
              <div className="h-3.5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <p className="font-extrabold text-fg text-lg">Sem anúncios ainda</p>
            <p className="text-sm text-muted-fg mt-1">
              {filters.q ? `Nenhum resultado para "${filters.q}"` : "Seja o primeiro a publicar no seu bairro"}
            </p>
          </div>
          {user?.isVerified && (
            <Link
              href="/marketplace/new/"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-hover transition-colors text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Criar anúncio
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            role="list"
            aria-label="Anúncios"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {items.map((l, i) => (
              <div
                role="listitem"
                key={l.id}
                className="animate-fade-up"
                // Escalona só a primeira leva; "carregar mais" entra junto, sem esperar.
                style={{ animationDelay: `${i < 8 ? i * 45 : 0}ms` }}
              >
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => loadPage(false)}
              disabled={loading}
              className="mx-auto flex items-center gap-2 border border-border/50 shadow-sm bg-card text-fg font-semibold px-5 py-2.5 rounded-xl hover:border-primary/30 hover:text-primary transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? "Carregando..." : "Carregar mais"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
