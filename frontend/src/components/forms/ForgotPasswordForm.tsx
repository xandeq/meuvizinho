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

const MailIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export default function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
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
    setSentTo(data.email);
    setIsLoading(false);
  };

  if (sentTo) {
    // Antes era só uma linha de texto: quem chegava aqui não sabia onde procurar nem o que fazer se não chegasse.
    return (
      <div role="status" className="text-center space-y-4 animate-slide-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailIcon className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-fg">Confira seu e-mail</h2>
          <p className="text-sm text-fg/80">
            Se houver uma conta com <span className="font-semibold text-fg break-all">{sentTo}</span>, enviamos um link
            para criar uma senha nova. O link vale por 1 hora.
          </p>
          <p className="text-xs text-fg/80">Não chegou em alguns minutos? Olhe a caixa de spam ou promoções.</p>
        </div>
        <div className="flex flex-col gap-2 pt-1 text-sm font-semibold">
          <Link href="/login/" className="text-primary hover:text-primary-hover transition-colors">
            Voltar para login
          </Link>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-fg/80 hover:text-fg transition-colors"
          >
            Usar outro e-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        icon={<MailIcon />}
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
