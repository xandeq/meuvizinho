"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ListingForm from "@/components/features/marketplace/ListingForm";
import EmptyState from "@/components/ui/EmptyState";
import { useAuthStore } from "@/lib/auth";
import { getListing, updateListing } from "@/lib/api/marketplace";
import type { ListingDto } from "@/lib/types/marketplace";

export default function EditListingClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const listingId = Number(params?.id);

  const [listing, setListing] = useState<ListingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getListing(listingId);
      setListing(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (listingId) load();
  }, [listingId, load]);

  if (loading) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/4" />
              <div className="h-10 bg-muted rounded-xl w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error || !listing)
    return <EmptyState title={error ?? "Anúncio não encontrado"} description="O anúncio pode ter sido removido ou o link é inválido." />;
  if (user?.id !== listing.sellerId)
    return <EmptyState title="Sem permissão" description="Você não tem permissão para editar este anúncio." />;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold text-fg">Editar anúncio</h1>
      <ListingForm
        mode="edit"
        defaultValues={{
          title: listing.title,
          description: listing.description,
          price: listing.price,
          categoryCode: listing.categoryCode,
          subcategoryCode: listing.subcategoryCode,
          // photos kept on server; edit form requires new photos if user wants to replace
          photos: [],
        }}
        onSubmit={async (values) => {
          await updateListing(listing.id, {
            title: values.title,
            description: values.description,
            price: values.price,
            categoryCode: values.categoryCode,
            subcategoryCode: values.subcategoryCode,
          });
          router.push(`/marketplace/${listing.id}/`);
        }}
      />
    </div>
  );
}
