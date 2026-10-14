import { z } from 'zod';

export * from './feed';

export const emailSchema = z.string().email('E-mail inválido');
export const passwordSchema = z.string().min(8, 'Senha deve ter no mínimo 8 caracteres');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedPrivacyPolicy: z.literal(true, {
      message: 'Você precisa aceitar a política de privacidade',
    } as never),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    email: emailSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const cepSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido (use 00000-000)');

export const proofUploadSchema = z.object({
  cep: cepSchema,
  numero: z.string().max(20).optional(),
});
export type ProofUploadInput = z.infer<typeof proofUploadSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Nome obrigatório').max(80, 'Nome muito longo'),
  bio: z.string().max(160, 'Bio deve ter no máximo 160 caracteres'),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
