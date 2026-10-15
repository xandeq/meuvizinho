import { z } from 'zod';

export * from './feed';

export const emailSchema = z.string().email('E-mail inválido');

/**
 * Regra de senha do cadastro e da redefinição, igual à da API
 * (src/BairroNow.Api/Validators/PasswordRules.cs). Site e app mostram cada item
 * ao vivo enquanto a pessoa digita, em vez de só revelar a regra no erro.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: '8 ou mais caracteres', test: (s: string) => s.length >= 8 },
  { id: 'upper', label: 'Uma letra maiúscula', test: (s: string) => /[A-Z]/.test(s) },
  { id: 'digit', label: 'Um número', test: (s: string) => /[0-9]/.test(s) },
  { id: 'symbol', label: 'Um símbolo (!@#)', test: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial');

export const loginSchema = z.object({
  email: emailSchema,
  // Login não reaplica a regra de força: só exige que a senha foi digitada.
  password: z.string().min(1, 'Digite sua senha'),
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
