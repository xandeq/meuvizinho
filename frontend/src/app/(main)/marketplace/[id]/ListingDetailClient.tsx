"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";
import ListingDetailGallery from "@/components/features/marketplace/ListingDetailGallery";
import ReportListingDialog from "@/components/features/marketplace/ReportListingDialog";
import RatingForm from "@/components/features/marketplace/RatingForm";
import { useAuthStore } from "@/lib/auth";
import {
  getListing,
  toggleFavorite,
  markSold,
  deleteListing,
  getSellerRatings,
  renewListing,
} from "@/lib/api/marketplace";
import { createConversation } from "@/lib/api/chat";
import type {
  ListingDto,
  RatingDto,
  SellerRatingsResponse,
} from "@/lib/types/marketplace";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function ListingDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const listingId = Number(params?.id);

  const [listing, setListing] = useState<ListingDto | null>(null);
  const [ratings, setRatings] = useState<SellerRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [existingRating, setExistingRating] = useState<RatingDto | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getListing(listingId);
      setListing(data);
      setFavorited(data.isFavoritedByCurrentUser);
      const r = await getSellerRatings(data.sellerId);
      setRatings(r);
      if (user) {
        const mine =
          r.ratings.find(
            (x) => x.buyerId === user.id && x.listingId === data.id
          ) ?? null;
        setExistingRating(mine);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [listingId, user]);

  useEffect(() => {
    if (listingId) load();
  }, [listingId, load]);

  if (loading) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <div className="aspect-video w-full bg-muted animate-pulse rounded-2xl" />
        <div className="space-y-3">
          <div className="h-7 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-3" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
          <div className="h-3 bg-muted rounded w-4/6" />
        </div>
      </div>
    );
  }
  if (error || !listing)
    return (
      <p className="text-danger font-semibold">
        {error ?? "Anúncio não encontrado"}
      </p>
    );

  const isOwner = user?.id === listing.sellerId;
  const isSold = listing.status === "sold";
  const isExpired = listing.status === "expired";

  const startChat = async () => {
    setBusy(true);
    try {
      const conv = await createConversation(listing.id);
      router.push(`/chat/${conv.id}/`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar chat");
    } finally {
      setBusy(false);
    }
  };

  const onFavorite = async () => {
    try {
      const res = await toggleFavorite(listing.id);
      setFavorited(res.favorited);
    } catch {
      // best-effort
    }
  };

  const onMarkSold = async () => {
    setBusy(true);
    try {
      const updated = await markSold(listing.id);
      setListing(updated);
    } finally {
      setBusy(false);
    }
  };

  const onRenew = async () => {
    setBusy(true);
    try {
      const updated = await renewListing(listing.id);
      setListing(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao renovar");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Remover este anúncio?")) return;
    setBusy(true);
    try {
      await deleteListing(listing.id);
      router.push("/marketplace/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <ListingDetailGallery photos={listing.photos} title={listing.title} />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-fg flex-1">
            {listing.title}
          </h1>
          {isSold && (
            <span role="status" aria-label="Anuncio vendido" className="bg-danger text-white font-extrabold px-3 py-1 rounded-xl">
              VENDIDO
            </span>
          )}
          {isExpired && (
            <span role="status" aria-label="Anuncio expirado" className="bg-gray-600 text-white font-extrabold px-3 py-1 rounded-xl">
              EXPIRADO
            </span>
          )}
        </div>
        <p className="text-3xl text-primary font-extrabold">
          {BRL.format(listing.price)}
        </p>
        <p className="text-sm text-fg/60 font-medium">
          Publicado em {new Date(listing.createdAt).toLocaleDateString("pt-BR")}
        </p>
        {listing.daysUntilExpiry != null && !isSold && !isExpired && (
          <p className={`text-sm font-semibold ${listing.daysUntilExpiry <= 3 ? "text-amber-600" : "text-fg/50"}`}>
            {listing.daysUntilExpiry === 0
              ? "Expira hoje"
              : `Expira em ${listing.daysUntilExpiry} dia${listing.daysUntilExpiry !== 1 ? "s" : ""}`}
          </p>
        )}
        {isExpired && (
          <p className="text-sm font-semibold text-danger">
            Este anúncio expirou. Renove para reativá-lo.
          </p>
        )}
      </div>

      <div className="bg-bg border-2 border-border rounded-xl p-4 space-y-2">
        <h2 className="font-bold text-fg">Vendedor</h2>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg">
            {listing.sellerDisplayName}
          </span>
          {listing.sellerIsVerified && <VerifiedBadge verified size="sm" />}
        </div>
        {ratings && ratings.count > 0 && (
          <p className="text-sm text-fg/60 font-medium">
            ★ {ratings.average.toFixed(1)} ({ratings.count} avaliações)
          </p>
        )}
      </div>

      <div className="bg-bg border-2 border-border rounded-xl p-4">
        <h2 className="font-bold text-fg mb-2">Descrição</h2>
        <p className="text-fg/80 whitespace-pre-wrap">{listing.description}</p>
      </div>

      {!isOwner && !isSold && !isExpired && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startChat}
            disabled={busy}
            className="flex-1 bg-primary text-white font-extrabold py-3 rounded-xl disabled:opacity-50"
          >
            Chat com vendedor
          </button>
          <button
            type="button"
            onClick={onFavorite}
            aria-label="Favoritar"
            className="border-2 border-border rounded-xl px-4 text-2xl"
          >
            {favorited ? "❤️" : "🤍"}
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="border-2 border-danger text-danger font-semibold rounded-xl px-4"
          >
            Denunciar
          </button>
        </div>
      )}

      {isOwner && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/marketplace/${listing.id}/edit/`}
            className="border-2 border-border font-semibold px-4 py-2 rounded-xl"
          >
            Editar
          </Link>
          {(isExpired || (listing.daysUntilExpiry != null && listing.daysUntilExpiry <= 7)) && !isSold && (
            <button
              type="button"
              onClick={onRenew}
              disabled={busy}
              className="bg-amber-500 text-white font-extrabold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {isExpired ? "Reativar anúncio" : "Renovar (+30 dias)"}
            </button>
          )}
          {!isSold && !isExpired && (
            <button
              type="button"
              onClick={onMarkSold}
              disabled={busy}
              className="bg-accent text-accent-fg font-extrabold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              Marcar como vendido
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="bg-danger text-white font-extrabold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      )}

      {!isOwner && isSold && (
        <RatingForm
          sellerId={listing.sellerId}
          listingId={listing.id}
          existing={existingRating}
          onDone={(r) => setExistingRating(r)}
        />
      )}

      {showReport && (
        <ReportListingDialog
          listingId={listing.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
