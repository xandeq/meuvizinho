"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { passwordSchema } from "@bairronow/shared-validators";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import PasswordField from "@/components/forms/PasswordField";
import PasswordChecklist from "@/components/forms/PasswordChecklist";

// Mesma regra do cadastro e da API.
const schema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Repita a senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const newPassword = watch("newPassword") ?? "";

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setIsLoading(true);
    try {
      await api.post("/api/v1/auth/reset-password", {
        token,
        email,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setServerError(
        error.response?.data?.error ||
          "Não foi possível redefinir a senha. Tente de novo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 animate-fade-up" role="status">
        <p className="font-bold text-fg text-lg">Senha redefinida</p>
        <p className="text-sm text-muted-fg">Use a nova senha para entrar.</p>
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <PasswordField
          label="Nova senha"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <PasswordChecklist value={newPassword} />
      </div>
      <PasswordField
        label="Confirmar nova senha"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {serverError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger font-medium">
          {serverError}
        </div>
      )}
      <Button type="submit" loading={isLoading} fullWidth size="lg">
        Redefinir senha
      </Button>
    </form>
  );
}
