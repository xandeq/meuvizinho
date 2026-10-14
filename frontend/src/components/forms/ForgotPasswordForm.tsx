"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post("/api/v1/auth/forgot-password", data);
    } catch {
      // Always show success to prevent email enumeration
    }
    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-secondary font-semibold">
          Se o e-mail existir, enviaremos um link de recuperação.
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormField
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" loading={isLoading} fullWidth>
        Enviar link de recuperação
      </Button>
      <p className="text-center text-sm font-semibold">
        <Link
          href="/login/"
          className="text-primary hover:text-primary-hover transition-colors"
        >
          Voltar para login
        </Link>
      </p>
    </form>
  );
}
