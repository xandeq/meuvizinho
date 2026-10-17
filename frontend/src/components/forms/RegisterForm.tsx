"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emailSchema, passwordSchema } from "@bairronow/shared-validators";
import type { AuthResponse } from "@bairronow/shared-types";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import PasswordField from "@/components/forms/PasswordField";
import PasswordChecklist from "@/components/forms/PasswordChecklist";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Mesma regra de senha do app e da API (@bairronow/shared-validators).
const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Repita a senha"),
    acceptedPrivacyPolicy: z.literal(true, {
      error: "Você precisa aceitar a Política de Privacidade",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const MailIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);


// Login com Google no SITE exige o client OAuth Web configurado na API (Google:ClientId/Secret). Sem ele
// o botão levava a um JSON "Erro interno do servidor" (500). Fica escondido até NEXT_PUBLIC_GOOGLE_WEB_LOGIN=1.
const GOOGLE_WEB_LOGIN = process.env.NEXT_PUBLIC_GOOGLE_WEB_LOGIN === "1";

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  const password = watch("password") ?? "";

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setIsLoading(true);
    try {
      const res = await api.post<Partial<AuthResponse> & { message?: string }>("/api/v1/auth/register", {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        acceptedPrivacyPolicy: data.acceptedPrivacyPolicy,
      });
      // A API já devolve a sessão: segue direto para o CEP, como no app.
      if (res.data.accessToken && res.data.user) {
        useAuthStore.getState().login(res.data.accessToken, res.data.user);
        router.replace("/cep-lookup/");
        return;
      }
      setCreated(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setServerError(
        error.response?.data?.error || "Não foi possível criar a conta. Tente de novo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (created) {
    return (
      <div className="text-center py-4 space-y-4 animate-fade-up" role="status">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-light text-primary grid place-items-center">
          <MailIcon />
        </div>
        <div>
          <p className="font-bold text-fg text-lg">Conta criada</p>
          <p className="text-sm text-muted-fg mt-1">Entre com seu e-mail e senha para continuar.</p>
        </div>
        <Link
          href="/login/"
          className="inline-flex h-11 items-center px-5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {GOOGLE_WEB_LOGIN && (
        <>
      <div className="space-y-2">
        <a
          href={`${API_BASE_URL}/api/v1/auth/google`}
          className="w-full flex items-center justify-center gap-3 px-4 h-12 border border-border/50 rounded-xl bg-card hover:bg-muted hover:border-border-strong hover:-translate-y-px active:translate-y-0 active:scale-[0.98] transition-all duration-200 font-semibold text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <GoogleLogo />
          Cadastrar com Google
        </a>
        {/* O cadastro pelo Google não passa pela caixa de aceite: o aviso deixa o consentimento explícito. */}
        <p className="text-xs text-muted-fg text-center">
          Ao continuar com Google, você aceita a{" "}
          <Link href="/privacy-policy/" target="_blank" className="font-semibold text-primary hover:text-primary-hover">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-medium text-muted-fg">ou com e-mail</span>
        <div className="flex-1 h-px bg-border" />
      </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          icon={<MailIcon />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-2">
          <PasswordField
            label="Senha"
            autoComplete="new-password"
            placeholder="Crie uma senha"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordChecklist value={password} />
        </div>

        <PasswordField
          label="Confirmar senha"
          autoComplete="new-password"
          placeholder="Repita a senha"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <div className="space-y-1.5">
          <label className="flex items-start gap-2.5 text-sm text-fg/80 font-medium cursor-pointer">
            <input
              type="checkbox"
              {...register("acceptedPrivacyPolicy")}
              className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
            />
            <span>
              Li e aceito a{" "}
              <Link
                href="/privacy-policy/"
                className="text-primary font-semibold hover:text-primary-hover"
                target="_blank"
              >
                Política de Privacidade
              </Link>
            </span>
          </label>
          {errors.acceptedPrivacyPolicy && (
            <p className="text-xs text-danger font-semibold">
              {errors.acceptedPrivacyPolicy.message}
            </p>
          )}
        </div>

        {serverError && (
          <div
            key={serverError}
            role="alert"
            className="animate-shake rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger font-medium"
          >
            {serverError}
          </div>
        )}

        <Button type="submit" loading={isLoading} fullWidth size="lg">
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-fg">
        Já tem conta?{" "}
        <Link href="/login/" className="font-semibold text-primary hover:text-primary-hover transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  );
}
