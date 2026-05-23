"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const registerSchema = z
  .object({
    email: z.string().email("E-mail invalido"),
    password: z
      .string()
      .min(8, "Senha deve ter no minimo 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiuscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um numero")
      .regex(
        /[^A-Za-z0-9]/,
        "Senha deve conter pelo menos um caractere especial"
      ),
    confirmPassword: z.string(),
    acceptedPrivacyPolicy: z.literal(true, {
      error: "Voce deve aceitar a politica de privacidade",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setIsLoading(true);
    try {
      await api.post("/api/v1/auth/register", {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        acceptedPrivacyPolicy: data.acceptedPrivacyPolicy,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setServerError(
        error.response?.data?.error || "Erro ao criar conta. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-6 space-y-4">
        <p className="text-secondary font-semibold text-lg">
          Verifique seu e-mail para confirmar sua conta.
        </p>
        <Link
          href="/login/"
          className="inline-block text-primary font-semibold hover:text-primary-hover"
        >
          Voltar para login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <a
        href={`${API_BASE_URL}/api/v1/auth/google`}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border/50 rounded-xl hover:bg-muted hover:border-border-strong transition-all duration-200 font-semibold"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Cadastrar com Google
      </a>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-bg text-fg/60 font-medium">ou</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Senha"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          label="Confirmar senha"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <div className="space-y-1.5">
          <label className="flex items-start gap-2 text-sm text-fg/80 font-medium">
            <input
              type="checkbox"
              {...register("acceptedPrivacyPolicy")}
              className="mt-1 w-4 h-4 accent-primary"
            />
            <span>
              Li e aceito a{" "}
              <Link
                href="/privacy-policy/"
                className="text-primary font-semibold hover:text-primary-hover"
                target="_blank"
              >
                Politica de Privacidade
              </Link>
            </span>
          </label>
          {errors.acceptedPrivacyPolicy && (
            <p className="text-sm text-danger font-medium">
              {errors.acceptedPrivacyPolicy.message}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-danger font-semibold">{serverError}</p>
        )}

        <Button type="submit" loading={isLoading} fullWidth>
          Criar conta
        </Button>

        <p className="text-center text-sm font-semibold">
          <Link
            href="/login/"
            className="text-primary hover:text-primary-hover transition-colors"
          >
            Ja tem conta? Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
