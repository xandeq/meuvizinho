"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { profileApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import type { AuthResponse } from "@bairronow/shared-types";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const MailIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const EyeOpenIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function ServerError({ message }: { message: string }) {
  return (
    <div
      key={message}
      role="alert"
      className="animate-shake flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-light px-4 py-3"
    >
      <svg className="w-4 h-4 mt-0.5 text-danger shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-sm text-danger font-medium leading-snug">{message}</p>
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const navigateAfterLogin = async () => {
    let destination = "/cep-lookup/";
    try {
      const profile = await profileApi.getMe();
      if (profile.bairroNome) {
        const current = useAuthStore.getState().user;
        if (current) useAuthStore.getState().setUser({ ...current, bairroName: profile.bairroNome });
      }
      if (profile.isVerified) destination = "/feed/";
    } catch {
      // ignore - fall back to onboarding
    }
    router.replace(destination);
  };

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsLoading(true);
    try {
      const response = await api.post<
        AuthResponse & { requiresTotp?: boolean; tempToken?: string }
      >("/api/v1/auth/login", data);

      if (response.data.requiresTotp && response.data.tempToken) {
        setTotpRequired(true);
        setTempToken(response.data.tempToken);
        return;
      }

      useAuthStore
        .getState()
        .login(response.data.accessToken, response.data.user);
      await navigateAfterLogin();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setServerError(
        error.response?.data?.error || "Erro ao fazer login. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpVerify = async () => {
    if (!tempToken || totpCode.length !== 6) return;
    setServerError(null);
    setTotpLoading(true);
    try {
      const response = await api.post<AuthResponse>(
        "/api/v1/auth/login/totp-verify",
        { tempToken, code: totpCode }
      );
      useAuthStore
        .getState()
        .login(response.data.accessToken, response.data.user);
      await navigateAfterLogin();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setServerError(
        error.response?.data?.error || "Código inválido. Tente novamente."
      );
    } finally {
      setTotpLoading(false);
    }
  };

  if (totpRequired) {
    return (
      <div className="space-y-5 animate-fade-up">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
            <ShieldIcon />
          </div>
          <div>
            <h2 className="text-base font-bold text-fg">
              Verificação em duas etapas
            </h2>
            <p className="text-sm text-muted-fg mt-0.5">
              Digite o código de 6 dígitos do seu aplicativo autenticador.
            </p>
          </div>
        </div>

        <FormField
          id="totpCode"
          name="totpCode"
          label="Código TOTP"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
          className="text-center text-xl tracking-[0.5em] font-bold"
        />

        {serverError && <ServerError key={serverError} message={serverError} />}

        <Button
          type="button"
          onClick={handleTotpVerify}
          loading={totpLoading}
          disabled={totpCode.length !== 6}
          fullWidth
          size="lg"
        >
          Verificar código
        </Button>

        <button
          type="button"
          onClick={() => {
            setTotpRequired(false);
            setTempToken(null);
            setTotpCode("");
            setServerError(null);
          }}
          className="w-full text-sm text-muted-fg hover:text-primary font-medium transition-colors py-1"
        >
          ← Voltar ao login
        </button>
      </div>
    );
  }

  const passwordSuffix = (
    <button
      type="button"
      tabIndex={0}
      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
      onClick={() => setShowPassword((v) => !v)}
      className="p-2 text-muted-fg hover:text-fg transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
    </button>
  );

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="animate-slide-up stagger-slide-1">
          <FormField
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            error={errors.email?.message}
            icon={<MailIcon />}
            {...register("email")}
          />
        </div>

        <div className="space-y-1.5 animate-slide-up stagger-slide-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-fg">
              Senha
            </label>
            <Link
              href="/forgot-password/"
              className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            error={!!errors.password}
            icon={<LockIcon />}
            suffix={passwordSuffix}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs font-semibold text-danger flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && <ServerError key={serverError} message={serverError} />}

        <div className="animate-slide-up stagger-slide-3">
          <Button type="submit" loading={isLoading} fullWidth size="lg" className="mt-2">
            Entrar
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-3 animate-slide-up stagger-slide-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-medium text-muted-fg">ou continue com</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="animate-slide-up stagger-slide-4">
        <a
          href={`${API_BASE_URL}/api/v1/auth/google`}
          className="w-full flex items-center justify-center gap-3 px-4 h-12 border border-border/50 rounded-xl bg-card hover:bg-muted hover:border-border-strong hover:-translate-y-px active:translate-y-0 active:scale-[0.98] transition-all duration-200 font-semibold text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Entrar com Google
        </a>
      </div>

      <div className="flex items-center justify-between text-sm animate-slide-up stagger-slide-5">
        <Link
          href="/auth/magic-link/"
          className="text-primary hover:text-primary-hover font-medium transition-colors"
        >
          Entrar sem senha →
        </Link>
        <Link
          href="/register/"
          className="text-muted-fg hover:text-fg font-medium transition-colors"
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}
