import { z } from "zod";
import { CATEGORY_CODES } from "@/lib/categories";

// Phase 4 Plan 02 Task 0: listing form schema.
// Matches backend CreateListingRequestValidator (04-01) + D-01 (1-6 photos), D-02 (numeric price).
export const listingSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(120, "Máximo 120 caracteres"),
  description: z
    .string()
    .min(10, "Mínimo 10 caracteres")
    .max(500, "Máximo 500 caracteres"),
  price: z
    .number({ message: "Preço obrigatório" })
    .min(0, "Preço não pode ser negativo")
    .max(999_999, "Preço muito alto"),
  categoryCode: z.enum(CATEGORY_CODES as [string, ...string[]], {
    message: "Categoria inválida",
  }),
  subcategoryCode: z.string().min(1, "Subcategoria obrigatória"),
  photos: z
    .array(z.instanceof(File))
    .min(1, "Adicione pelo menos 1 foto")
    .max(6, "Máximo 6 fotos"),
});

export type ListingFormValues = z.infer<typeof listingSchema>;

// For edit (photos optional — can keep existing)
export const listingEditSchema = listingSchema.extend({
  photos: z.array(z.instanceof(File)).max(6, "Máximo 6 fotos").optional(),
});

export type ListingEditFormValues = z.infer<typeof listingEditSchema>;
