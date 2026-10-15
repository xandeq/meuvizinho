"use client";

import { CATEGORIES } from "@/lib/categories";
import type { MarketplaceFilters } from "@/stores/marketplace-store";

export interface FilterChipsProps {
  filters: MarketplaceFilters;
  onChange: (patch: Partial<MarketplaceFilters>) => void;
}

const SORT_OPTIONS = [
  { value: "recent",     label: "Recentes" },
  { value: "price_asc",  label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
] as const;

export default function FilterChips({ filters, onChange }: FilterChipsProps) {
  const activeSort = filters.sort ?? "recent";

  return (
    <div className="space-y-3">
      {/* Category chips: no celular, uma linha com rolagem lateral. Antes eram 3 linhas de
          categorias e os anúncios ficavam abaixo da dobra. */}
      <div className="flex gap-1.5 items-center overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&>*]:shrink-0">
        <button
          type="button"
          onClick={() => onChange({ category: undefined })}
          className={[
            "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200",
            !filters.category
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-muted text-muted-fg border-border/50 hover:border-primary/30 hover:text-primary",
          ].join(" ")}
        >
          Todas
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() =>
              onChange({ category: filters.category === c.code ? undefined : c.code })
            }
            className={[
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200",
              filters.category === c.code
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-muted text-muted-fg border-border/50 hover:border-primary/30 hover:text-primary",
            ].join(" ")}
          >
            {c.displayName}
          </button>
        ))}
      </div>

      {/* Sort + verified + price row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort chips */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1" role="group" aria-label="Ordenar por">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={activeSort === opt.value}
              onClick={() => onChange({ sort: opt.value })}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                activeSort === opt.value
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-fg hover:text-fg",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border/60" />

        {/* Verified seller toggle */}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-fg cursor-pointer">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => onChange({ verifiedOnly: e.target.checked })}
            className="w-3.5 h-3.5 accent-primary rounded"
          />
          Só verificados
        </label>
        {!filters.verifiedOnly && (
          <span className="text-xs text-accent font-semibold bg-accent/10 px-2 py-0.5 rounded-full">
            ⚠ inclui não verificados
          </span>
        )}

        {/* Price range */}
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-fg">
          <span>R$</span>
          <input
            type="number"
            placeholder="mín"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-16 border border-border/50 rounded-lg px-2 py-1.5 text-xs bg-muted text-fg focus:border-primary focus:outline-none transition-colors"
          />
          <span>–</span>
          <input
            type="number"
            placeholder="máx"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-16 border border-border/50 rounded-lg px-2 py-1.5 text-xs bg-muted text-fg focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
