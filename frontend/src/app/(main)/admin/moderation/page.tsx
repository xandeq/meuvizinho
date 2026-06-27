"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReportDto, ReportTargetType } from "@bairronow/shared-types";
import FeedHeader from "@/components/layouts/FeedHeader";
import { feedClient } from "@/lib/feed";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";

// Phase 4 Plan 02 Task 2: extended unified moderation queue — posts + comments + listings.
// Shared queue per Phase 4 D-21 — same endpoint, discriminated by targetType.
// Wave J: ban button added (targetId-based, backend derives author).

function BanIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

type TargetFilter = "all" | ReportTargetType;

const TYPE_LABELS: Record<ReportTargetType, string> = {
  post: "Post",
  comment: "Comentário",
  listing: "Anúncio",
};

const TYPE_BADGE: Record<ReportTargetType, string> = {
  post: "bg-primary/10 text-primary ring-primary/30",
  comment: "bg-accent/10 text-accent ring-accent/30",
  listing: "bg-secondary/10 text-secondary ring-secondary/30",
};

export default function ModerationPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;

  const [reports, setReports] = useState<ReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<TargetFilter>("all");
  const [banTarget, setBanTarget] = useState<ReportDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await feedClient.listPendingReports(0, 100);
      setReports(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao listar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? reports
        : reports.filter((r) => r.targetType === filter),
    [reports, filter]
  );

  const handleResolve = async (id: number, action: "dismiss" | "remove") => {
    setBusyId(id);
    try {
      await feedClient.resolveReport(id, action);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao resolver");
    } finally {
      setBusyId(null);
    }
  };

  const handleBanConfirm = async () => {
    if (!banTarget) return;
    const report = banTarget;
    setBanTarget(null);
    setBusyId(report.id);
    try {
      // Backend looks up the content author from the report and bans them
      await api.post(`/api/v1/admin/moderation/reports/${report.id}/ban-author`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao banir usuário");
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <FeedHeader />
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
          <h1 className="text-xl font-extrabold text-fg">Acesso negado</h1>
        </div>
      </div>
    );
  }

  const filters: Array<{ code: TargetFilter; label: string }> = [
    { code: "all", label: "Todos" },
    { code: "post", label: "Posts" },
    { code: "comment", label: "Comentários" },
    { code: "listing", label: "Anúncios" },
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      <FeedHeader />
      <h1 className="text-2xl font-extrabold text-fg">Moderação</h1>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.code}
            type="button"
            onClick={() => setFilter(f.code)}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200",
              filter === f.code
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-muted text-muted-fg border-border/50 hover:border-primary/30 hover:text-primary",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-card border border-border/50 shadow-sm rounded-2xl p-3 animate-pulse">
              <div className="h-5 bg-muted rounded-full w-16" />
              <div className="h-4 bg-muted rounded w-12" />
              <div className="h-4 bg-muted rounded w-36" />
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 bg-muted rounded w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
          <p className="text-fg/60 font-medium">Nenhuma denúncia pendente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-card rounded-2xl border border-border/50 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left font-bold text-fg/70 border-b-2 border-border">
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Alvo</th>
                <th className="px-3 py-2">Denunciante</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Nota</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block text-xs font-bold rounded-full px-2 py-0.5 ring-1 ${
                        TYPE_BADGE[r.targetType] ??
                        "bg-muted text-fg ring-border"
                      }`}
                    >
                      {TYPE_LABELS[r.targetType] ?? r.targetType}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {r.targetType === "post" ? (
                      <Link
                        href={`/feed/post/?id=${r.targetId}`}
                        className="text-primary underline font-bold"
                      >
                        #{r.targetId}
                      </Link>
                    ) : r.targetType === "listing" ? (
                      <Link
                        href={`/marketplace/${r.targetId}/`}
                        className="text-primary underline font-bold"
                      >
                        #{r.targetId}
                      </Link>
                    ) : (
                      `#${r.targetId}`
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium max-w-[120px] truncate">{r.reporterEmail}</td>
                  <td className="px-3 py-2 font-medium max-w-[100px] truncate">{r.reason}</td>
                  <td className="px-3 py-2 text-fg/70 max-w-[100px] truncate">{r.note ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => handleResolve(r.id, "remove")}
                        className="bg-danger hover:bg-danger/90 text-white text-xs font-semibold rounded-xl px-2 py-1 disabled:opacity-50"
                      >
                        Remover
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => handleResolve(r.id, "dismiss")}
                        className="border border-border/50 text-fg text-xs font-semibold rounded-lg px-2 py-1 disabled:opacity-50"
                      >
                        Dispensar
                      </button>
                      {(r.targetType === "post" || r.targetType === "listing") && (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => setBanTarget(r)}
                          className="inline-flex items-center gap-1 bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 text-xs font-semibold rounded px-2 py-1 disabled:opacity-50 transition-colors"
                        >
                          <BanIcon />
                          Banir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {banTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-fg mb-2">Confirmar ação</h3>
            <p className="text-sm text-muted-fg mb-5">
              Banir este usuário? Esta ação irá desativar a conta permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBanTarget(null)}
                className="px-4 py-2 text-sm rounded-xl text-muted-fg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBanConfirm}
                className="px-4 py-2 text-sm rounded-xl bg-danger text-white hover:bg-danger/90 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
