"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Senha deve ter no minimo 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiuscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número")
      .regex(
        /[^A-Za-z0-9]/,
        "Senha deve conter pelo menos um caractere especial"
      ),
    confirmPassword: z.string(),
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
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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
          "Erro ao redefinir senha. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-secondary font-semibold">
          Senha redefinida com sucesso!
        </p>
        <Link
          href="/login/"
          className="inline-block text-primary font-semibold hover:text-primary-hover"
        >
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormField
        label="Nova senha"
        type="password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <FormField
        label="Confirmar nova senha"
        type="password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {serverError && (
        <p className="text-sm text-danger font-semibold">{serverError}</p>
      )}
      <Button type="submit" loading={isLoading} fullWidth>
        Redefinir senha
      </Button>
    </form>
  );
}
