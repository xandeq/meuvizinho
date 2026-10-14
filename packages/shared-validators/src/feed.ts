import { z } from 'zod';

export const postCategorySchema = z.enum([
  'Dica',
  'Alerta',
  'Pergunta',
  'Evento',
  'Geral',
]);
export type PostCategoryInput = z.infer<typeof postCategorySchema>;

export const createPostSchema = z.object({
  category: postCategorySchema,
  body: z
    .string()
    .min(1, 'Conteúdo obrigatório')
    .max(2000, 'Máximo 2000 caracteres'),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  postId: z.number().int().positive(),
  parentCommentId: z.number().int().positive().nullable(),
  body: z
    .string()
    .min(1, 'Comentário obrigatório')
    .max(500, 'Máximo 500 caracteres'),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const reportReasonSchema = z.enum([
  'spam',
  'offensive',
  'discrimination',
  'misinformation',
  'other',
]);
export type ReportReasonInput = z.infer<typeof reportReasonSchema>;

export const createReportSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.number().int().positive(),
  reason: reportReasonSchema,
  note: z.string().max(500).nullable(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const searchSchema = z.object({
  q: z.string().min(1, 'Busca obrigatória').max(200),
  category: postCategorySchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  authorId: z.string().optional(),
});
export type SearchInput = z.infer<typeof searchSchema>;
