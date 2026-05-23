"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import {
  getCategories,
  adminToggleCategory,
} from "@/lib/api/marketplace";
import type { CategoryDto } from "@/lib/types/marketplace";

// D-26: Admin can toggle categories ON/OFF only (no create/delete).
export default function AdminCategoriesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const toggle = async (code: string, enabled: boolean) => {
    setBusyCode(code);
    try {
      await adminToggleCategory(code, enabled);
      setCategories((cs) =>
        cs.map((c) => (c.code === code ? { ...c, enabled } : c))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusyCode(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-bg rounded-lg border-2 border-border p-6">
        <h1 className="text-xl font-extrabold text-fg">Acesso negado</h1>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-extrabold text-fg">Categorias</h1>
      <p className="text-fg/60 font-medium text-sm">
        Ative ou desative categorias do marketplace. Não é possível criar ou
        remover categorias.
      </p>

      {error && (
        <p className="text-sm text-danger font-semibold">{error}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between bg-bg border-2 border-border rounded-lg p-3 animate-pulse">
              <div className="space-y-1.5">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
              <div className="h-5 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.code}
              className="flex items-center justify-between bg-bg border-2 border-border rounded-lg p-3"
            >
              <div>
                <p className="font-bold text-fg">{c.displayName}</p>
                <p className="text-xs text-fg/50 font-medium">
                  {c.subcategories.length} subcategorias
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-semibold text-fg">
                  {c.enabled ? "Ativa" : "Desativada"}
                </span>
                <input
                  type="checkbox"
                  checked={c.enabled}
                  disabled={busyCode === c.code}
                  onChange={(e) => toggle(c.code, e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
