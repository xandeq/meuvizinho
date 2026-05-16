"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/layouts/AuthLayout";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cepApi } from "@/lib/api";
import { useOnboardingStore } from "@/lib/onboarding";
import { cepSchema } from "@bairronow/shared-validators";
import type { CepLookupResult } from "@bairronow/shared-types";

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function CEPLookupPage() {
  const router = useRouter();
  const setAddress = useOnboardingStore((s) => s.setAddress);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [cep, setCep] = useState("");
  const [result, setResult] = useState<CepLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    setError(null);
    setResult(null);
    const parsed = cepSchema.safeParse(cep);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "CEP invalido");
      return;
    }
    setLoading(true);
    try {
      const r = await cepApi.lookup(cep);
      setResult(r);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Nao foi possivel consultar o CEP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    setAddress(result);
    setStep("proof");
    router.push("/proof-upload/");
  };

  return (
    <AuthLayout
      title="Onde você mora?"
      subtitle="Confirme seu endereço para entrar na comunidade"
    >
      <div className="space-y-5">
        {/* Step progress */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-extrabold shrink-0">
            1
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full" />
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-fg text-sm font-extrabold shrink-0">
            2
          </div>
        </div>
        <p className="text-xs text-muted-fg font-semibold text-center">
          CEP → Comprovante
        </p>
        <FormField
          label="CEP"
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          maxLength={9}
          error={error ?? undefined}
        />
        <Button
          type="button"
          onClick={handleLookup}
          loading={loading}
          fullWidth
          disabled={cep.replace(/\D/g, "").length !== 8}
        >
          Buscar endereco
        </Button>

        {result && (
          <Card bg="muted" padding="md">
            <div className="space-y-1 text-sm font-medium">
              <p className="text-muted-fg">Endereco encontrado:</p>
              <p className="text-base font-bold text-fg">
                {result.logradouro || "(Logradouro nao informado)"}
              </p>
              <p>
                {result.bairro} — {result.localidade}/{result.uf}
              </p>
              <p className="text-muted-fg">CEP: {result.cep}</p>
              {result.bairroId !== null ? (
                <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                  Bairro reconhecido: {result.bairroNome}
                </p>
              ) : (
                <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  Fora de Vila Velha — verificacao manual sera necessaria
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleConfirm}
              >
                Confirmar e continuar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
}
