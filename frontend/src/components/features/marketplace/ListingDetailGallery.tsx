"use client";

import { useState } from "react";
import type { ListingPhoto } from "@/lib/types/marketplace";

export interface ListingDetailGalleryProps {
  photos: ListingPhoto[];
  title: string;
}

export default function ListingDetailGallery({
  photos,
  title,
}: ListingDetailGalleryProps) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center text-fg/40 font-bold">
        Sem imagem
      </div>
    );
  }
  const current = photos[index];
  return (
    <div className="space-y-2">
      <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setIndex(i)}
              aria-label={`Foto ${i + 1}`}
              className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 ${
                i === index ? "border-primary" : "border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnailUrl || p.url}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
