"use client";

import Link from "next/link";
import type { ListingDto } from "@/lib/types/marketplace";
import VerifiedBadge from "@/components/VerifiedBadge";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export interface ListingCardProps {
  listing: ListingDto;
}

function CameraIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg className="w-10 h-10 text-border-strong" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function ListingCard({ listing }: ListingCardProps) {
  const cover = listing.photos?.[0];
  const photoCount = listing.photos?.length ?? 0;
  const isSold = listing.status === "sold";
  const isExpired = listing.status === "expired";
  const expiresInDays = listing.daysUntilExpiry;
  const expiringUrgent = !isSold && !isExpired && expiresInDays != null && expiresInDays <= 3;
  const expiringWarning = !isSold && !isExpired && expiresInDays != null && expiresInDays > 3 && expiresInDays <= 7;
  const sellerInitial = listing.sellerDisplayName?.[0]?.toUpperCase() ?? "?";

  return (
    <Link
      href={`/marketplace/${listing.id}/`}
      className="group block rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-primary/30 transition-all duration-300 ease-out"
    >
      {/* Image */}
      <div className="relative aspect-square w-full bg-muted overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.thumbnailUrl || cover.url}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImagePlaceholderIcon />
            <span className="text-xs text-muted-fg font-medium">Sem imagem</span>
          </div>
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 flex items-center justify-center">
            <span
              role="status"
              aria-label="Anuncio vendido"
              className="bg-danger text-white text-sm font-extrabold px-4 py-2 rounded-xl shadow-md"
            >
              VENDIDO
            </span>
          </div>
        )}

        {/* Expired overlay */}
        {isExpired && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 flex items-center justify-center">
            <span
              role="status"
              aria-label="Anuncio expirado"
              className="bg-muted-fg text-white text-sm font-extrabold px-4 py-2 rounded-xl shadow-md"
            >
              EXPIRADO
            </span>
          </div>
        )}

        {/* Expiry badges */}
        {expiringUrgent && (
          <div className="absolute top-2 left-2">
            <span
              role="status"
              aria-label={`Expira em ${expiresInDays} dias`}
              className="bg-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm"
            >
              ⏱ {expiresInDays}d
            </span>
          </div>
        )}
        {expiringWarning && (
          <div className="absolute top-2 left-2">
            <span
              role="status"
              aria-label={`Expira em ${expiresInDays} dias`}
              className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm"
            >
              {expiresInDays}d restantes
            </span>
          </div>
        )}

        {/* Photo count */}
        {photoCount > 1 && !isSold && !isExpired && (
          <div className="absolute top-2 right-2">
            <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
              <CameraIcon />
              {photoCount}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-fg text-sm line-clamp-2 leading-snug min-h-[2.5rem]">
          {listing.title}
        </h3>
        <p className="text-primary font-extrabold text-xl tracking-tight">
          {BRL.format(listing.price)}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold flex items-center justify-center shrink-0">
              {sellerInitial}
            </span>
            <span className="text-xs text-muted-fg truncate font-medium">
              {listing.sellerDisplayName}
            </span>
            {listing.sellerIsVerified && (
              <VerifiedBadge verified size="sm" />
            )}
          </div>
          <div onClick={(e) => e.preventDefault()}>
            <WhatsAppShareButton
              url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://bairronow.com.br"}/m/${listing.id}`}
              text="Veja esta oferta no BairroNow"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
