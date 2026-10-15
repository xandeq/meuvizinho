import { z } from 'zod';

export const listingPhotoAssetSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

export const createListingSchema = z.object({
  title: z.string().min(3, 'Título muito curto').max(100, 'Máximo 100 caracteres'),
  description: z
    .string()
    .min(10, 'Descreva com mais detalhes')
    .max(500, 'Máximo 500 caracteres'),
  price: z
    .number({ message: 'Preço obrigatório' })
    .min(0, 'Preço não pode ser negativo')
    .max(9_999_999, 'Valor muito alto'),
  categoryCode: z.string().min(1, 'Selecione uma categoria'),
  subcategoryCode: z.string().min(1, 'Selecione uma subcategoria'),
  photos: z
    .array(listingPhotoAssetSchema)
    .min(1, 'Adicione ao menos 1 foto')
    .max(6, 'Máximo 6 fotos'),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial().omit({ photos: true });
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
