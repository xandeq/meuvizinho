"use client";

import { useState } from "react";
import { feedClient } from "@/lib/feed";
import type { ReportReason, ReportTargetType } from "@bairronow/shared-types";

interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: number;
  open: boolean;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "Spam", label: "Spam" },
  { value: "Offensive", label: "Conteúdo ofensivo" },
  { value: "Discrimination", label: "Discriminação" },
  { value: "Misinformation", label: "Desinformação" },
  { value: "Other", label: "Outro" },
];

export default function ReportDialog({
  targetType,
  targetId,
  open,
  onClose,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>("Spam");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await feedClient.createReport({
        targetType,
        targetId,
        reason,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar denúncia");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-fg mb-3">Denunciar</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-fg mb-1">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="border border-border rounded-md px-3 py-2 w-full"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-fg mb-1">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              className="border border-border rounded-md px-3 py-2 w-full"
            />
          </div>
          {error && <p className="text-sm text-danger font-semibold">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border/50 font-semibold hover:border-border-strong transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 font-semibold disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
