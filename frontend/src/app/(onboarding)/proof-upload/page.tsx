"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/layouts/AuthLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ProofDropzone from "@/components/ProofDropzone";
import { verificationApi } from "@/lib/api";
import { useOnboardingStore } from "@/lib/onboarding";

export default function ProofUploadPage() {
  const router = useRouter();
  const address = useOnboardingStore((s) => s.address);
  const setProof = useOnboardingStore((s) => s.setProof);
  const setStep = useOnboardingStore((s) => s.setStep);
  const setStatus = useOnboardingStore((s) => s.setStatus);

  const [file, setFile] = useState<File | null>(null);
  const [numero, setNumero] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!file || !address) {
      setError("Selecione um comprovante e confirme o CEP antes.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("cep", address.cep);
      fd.append("numero", numero);
      fd.append("proof", file);
      const dto = await verificationApi.submit(fd);
      setProof(file.name);
      setStatus(dto);
      setStep("pending");
      router.push("/pending/");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Erro ao enviar comprovante";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Comprovante de residência"
      subtitle="Quase lá! Envie um documento que comprove seu endereço"
    >
      <div className="space-y-5">
        {/* Step progress */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-white text-sm font-extrabold shrink-0">
            ✓
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full w-full bg-primary rounded-full" />
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-extrabold shrink-0">
            2
          </div>
        </div>
        <p className="text-xs text-muted-fg font-semibold text-center">
          CEP ✓ → Comprovante
        </p>
        {address && (
          <div className="rounded-md bg-muted p-3 text-sm font-medium">
            <p className="text-fg/70">Endereco a verificar:</p>
            <p className="font-bold text-fg">
              {address.logradouro || "(sem logradouro)"} — {address.bairro}
            </p>
            <p>
              {address.localidade}/{address.uf} — CEP {address.cep}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-fg mb-1">
            Número (opcional)
          </label>
          <Input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value.slice(0, 20))}
            placeholder="Ex: 123 ap 401"
          />
        </div>

        <ProofDropzone onFile={setFile} />

        {error && <p className="text-sm text-danger font-semibold">{error}</p>}

        <Button
          type="button"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!file || !address}
          fullWidth
        >
          Enviar comprovante
        </Button>
      </div>
    </AuthLayout>
  );
}
