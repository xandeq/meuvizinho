"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";

interface Rating {
  id: number;
  stars: number;
  comment: string | null;
  createdAt: string;
  rater: { displayName: string | null; photoUrl: string | null; isVerified: boolean };
}

interface Props {
  businessUserId: string;
  canRate?: boolean;
}

function StarRow({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={[
            "text-xl leading-none transition-transform",
            !readonly && "hover:scale-125 cursor-pointer",
            readonly && "cursor-default",
            n <= value ? "text-accent" : "text-border",
          ].join(" ")}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function BusinessRating({
  businessUserId,
  canRate = true,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myStars, setMyStars] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    // axios: o fetch cru com o token da memória mostrava 0 avaliações depois dos 15 min do token.
    api.get<{ ratings?: Rating[]; average?: number | null; total?: number }>(`/api/v1/users/${businessUserId}/business-ratings`)
      .then(({ data: d }) => {
        setRatings(d.ratings ?? []);
        setAverage(d.average ?? null);
        setTotal(d.total ?? 0);
      })
      .catch(() => {
        setRatings([]);
        setAverage(null);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [businessUserId, submitted]);

  const handleSubmit = async () => {
    if (myStars === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/api/v1/users/${businessUserId}/business-ratings`, {
        stars: myStars,
        comment: myComment || undefined,
      });
      setSubmitted((s) => !s);
      setMyStars(0);
      setMyComment("");
    } catch (e) {
      // Antes não olhava a resposta: o formulário limpava como se tivesse dado certo e a avaliação sumia.
      setSubmitError(apiErrorMessage(e, "Não foi possível enviar a avaliação."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Average */}
      <div className="flex items-center gap-3">
        <div className="text-3xl font-extrabold text-fg">
          {average !== null ? average.toFixed(1) : "—"}
        </div>
        <div>
          <StarRow value={Math.round(average ?? 0)} readonly />
          <p className="text-xs text-muted-fg mt-0.5">
            {total} {total === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>
      </div>

      {/* Rate form */}
      {canRate && (
        <div className="bg-muted rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-fg">Avalie este negócio</p>
          <StarRow value={myStars} onChange={setMyStars} />
          {myStars > 0 && (
            <>
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder="Comentário opcional..."
                rows={2}
                className="w-full rounded-xl border border-border/50 bg-muted px-3 py-2 text-sm text-fg resize-none focus:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {submitting ? "Enviando..." : "Enviar avaliação"}
              </button>
              {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}
            </>
          )}
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <p className="text-sm text-muted-fg text-center py-4">
          Nenhuma avaliação ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {ratings.slice(0, 5).map((r) => (
            <div key={r.id} className="bg-muted rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fg">
                  {r.rater.displayName ?? "Usuário"}
                </span>
                <StarRow value={r.stars} readonly />
              </div>
              {r.comment && (
                <p className="text-sm text-muted-fg">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
