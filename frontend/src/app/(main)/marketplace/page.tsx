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
            className="border-2 border-amber-500 text-amber-700 font-semibold px-4 py-2 rounded-lg text-sm"
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
        <p className="text-fg/60 font-medium">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="bg-bg border-2 border-border rounded-lg p-8 text-center">
          <p className="text-fg/70 font-semibold mb-3">
            Nenhum anúncio encontrado.
          </p>
          {user?.isVerified && (
            <Link
              href="/marketplace/new/"
              className="inline-block bg-primary text-white font-extrabold px-4 py-2 rounded-lg"
            >
              Criar o primeiro anúncio
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
            {items.map((l) => (
              <div role="listitem" key={l.id}>
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => loadPage(false)}
              disabled={loading}
              className="mx-auto block border-2 border-border text-fg font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Carregar mais"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
