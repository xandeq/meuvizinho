"use client";

import { useState } from "react";
import { createRating, editRating } from "@/lib/api/marketplace";
import type { RatingDto } from "@/lib/types/marketplace";

// D-22/D-23: buyer rates seller 1-5 stars, editable within 7 days.

export interface RatingFormProps {
  sellerId: string;
  listingId: number;
  existing?: RatingDto | null;
  onDone?: (rating: RatingDto) => void;
}

export default function RatingForm({
  sellerId,
  listingId,
  existing,
  onDone,
}: RatingFormProps) {
  const [stars, setStars] = useState<number>(existing?.stars ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (stars < 1 || stars > 5) {
      setError("Escolha de 1 a 5 estrelas");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        stars,
        comment: comment || undefined,
        listingId,
      };
      const rating = existing
        ? await editRating(sellerId, existing.id, body)
        : await createRating(sellerId, body);
      onDone?.(rating);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao avaliar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 space-y-3">
      <h3 className="font-extrabold text-fg">
        {existing ? "Editar avaliação" : "Avaliar vendedor"}
      </h3>

      <div className="flex gap-1" role="radiogroup" aria-label="Estrelas">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)}
            className={`text-3xl transition ${
              n <= stars ? "text-yellow-500" : "text-border"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
        maxLength={500}
        className="w-full border border-border/50 rounded-xl px-3 py-2 text-sm bg-muted text-fg focus:border-primary focus:bg-card focus:outline-none transition-colors"
      />

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full bg-primary text-white font-extrabold py-2 rounded-lg disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
