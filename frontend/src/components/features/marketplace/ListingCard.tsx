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

export default function ListingCard({ listing }: ListingCardProps) {
  const cover = listing.photos?.[0];
  const isSold = listing.status === "sold";

  return (
    <Link
      href={`/marketplace/${listing.id}/`}
      className="block rounded-lg border-2 border-border bg-bg overflow-hidden hover:border-primary transition-colors"
    >
      <div className="relative aspect-square w-full bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.thumbnailUrl || cover.url}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg/40 font-bold">
            Sem imagem
          </div>
        )}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white text-lg font-extrabold px-4 py-2 rounded-md border-2 border-white">
              VENDIDO
            </span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-bold text-fg text-sm line-clamp-2 min-h-[2.5rem]">
          {listing.title}
        </h3>
        <p className="text-primary font-extrabold text-lg">
          {BRL.format(listing.price)}
        </p>
        <div className="flex items-center gap-1 text-xs text-fg/60 font-medium">
          <span className="truncate">{listing.sellerDisplayName}</span>
          {listing.sellerIsVerified && (
            <VerifiedBadge verified size="sm" />
          )}
        </div>
        <div className="pt-1" onClick={(e) => e.preventDefault()}>
          <WhatsAppShareButton
            url={`https://bairronow.com.br/m/${listing.id}`}
            text="Veja esta oferta no BairroNow"
          />
        </div>
      </div>
    </Link>
  );
}
