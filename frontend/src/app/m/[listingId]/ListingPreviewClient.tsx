"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ListingPreview {
  id: number;
  title: string;
  description: string;
  price: number;
  status: string;
  createdAt: string;
  sellerDisplayName: string;
  sellerIsVerified: boolean;
  photos: Array<{ url: string; thumbnailUrl?: string }>;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
}

export default function ListingPreviewClient({
  listingId,
}: {
  listingId: string;
}) {
  const [listing, setListing] = useState<ListingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (listingId === "preview") {
      setLoading(false);
      return;
    }

    const fetchListing = async () => {
      try {
        const { data } = await api.get<ListingPreview>(
          `/api/v1/listings/${listingId}`
        );
        setListing(data);
      } catch {
        setError("Anuncio nao encontrado");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [listingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="border-b-2 border-border px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between animate-pulse">
            <div className="h-7 bg-muted rounded w-32" />
            <div className="h-9 bg-muted rounded-lg w-24" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-video w-full bg-muted" />
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-7 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </div>
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="border-t border-border pt-4 space-y-2">
                <div className="h-4 bg-muted rounded w-1/5 mb-3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-danger font-semibold">
          {error ?? "Anuncio nao encontrado"}
        </p>
        <Link
          href="/login/"
          className="text-primary font-semibold hover:underline"
        >
          Ir para BairroNow
        </Link>
      </div>
    );
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bairronow.com.br";
  const shareUrl = `${SITE_URL}/m/${listing.id}`;
  const cover = listing.photos?.[0];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/feed/" className="text-2xl font-extrabold text-primary">
            BairroNow
          </Link>
          {!isAuthenticated && (
            <div className="flex gap-2">
              <Link
                href="/login/"
                className="px-4 py-2 text-sm font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register/"
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <article className="bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden">
          {cover && (
            <div className="aspect-video w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-fg">
                  {listing.title}
                </h1>
                <p className="text-3xl text-primary font-extrabold mt-1">
                  {BRL.format(listing.price)}
                </p>
              </div>
              {listing.status === "sold" && (
                <span role="status" aria-label="Anuncio vendido" className="bg-danger text-white font-extrabold px-3 py-1 rounded shrink-0">
                  VENDIDO
                </span>
              )}
              {listing.status === "expired" && (
                <span role="status" aria-label="Anuncio expirado" className="bg-muted-fg text-white font-extrabold px-3 py-1 rounded shrink-0">
                  EXPIRADO
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-fg/60 font-medium">
              <span>{listing.sellerDisplayName}</span>
              {listing.sellerIsVerified && (
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full font-semibold">
                  Verificado
                </span>
              )}
              <span>
                •{" "}
                {new Date(listing.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <div className="border-t border-border pt-4">
              <h2 className="font-bold text-fg mb-2">Descricao</h2>
              <p className="text-fg/80 whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <WhatsAppShareButton
                url={shareUrl}
                text="Veja esta oferta no BairroNow"
              />
            </div>
          </div>
        </article>

        {!isAuthenticated && (
          <div className="mt-8 bg-primary/10 border-2 border-primary/30 rounded-lg p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-fg">
              Entre no BairroNow para comprar e vender com vizinhos
            </h2>
            <p className="text-sm text-fg/70">
              Converse com o vendedor e feche negocios com seguranca.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login/"
                className="px-6 py-2 font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register/"
                className="px-6 py-2 font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
