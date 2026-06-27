'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { createSecurityAlert } from '@/lib/api/community';
import type { SecurityAlertKind } from '@/lib/types/community';
import { SECURITY_ALERT_KIND_LABELS, SECURITY_ALERT_KIND_EMOJI } from '@/lib/types/community';
import Button from '@/components/ui/Button';

const schema = z.object({
  kind: z.enum(['Furto', 'Suspeito', 'Incendio', 'Acidente', 'Outros']),
  description: z.string().min(10, { message: 'Descreva o que aconteceu (mínimo 10 caracteres).' }).max(1000),
  locationDescription: z.string().max(300).optional(),
});
type FormData = z.infer<typeof schema>;

const KIND_OPTIONS: { value: SecurityAlertKind; label: string; emoji: string }[] = [
  { value: 'Furto', label: SECURITY_ALERT_KIND_LABELS.Furto, emoji: SECURITY_ALERT_KIND_EMOJI.Furto },
  { value: 'Suspeito', label: SECURITY_ALERT_KIND_LABELS.Suspeito, emoji: SECURITY_ALERT_KIND_EMOJI.Suspeito },
  { value: 'Incendio', label: SECURITY_ALERT_KIND_LABELS.Incendio, emoji: SECURITY_ALERT_KIND_EMOJI.Incendio },
  { value: 'Acidente', label: SECURITY_ALERT_KIND_LABELS.Acidente, emoji: SECURITY_ALERT_KIND_EMOJI.Acidente },
  { value: 'Outros', label: SECURITY_ALERT_KIND_LABELS.Outros, emoji: SECURITY_ALERT_KIND_EMOJI.Outros },
];

export default function NewAlertaPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [selectedKind, setSelectedKind] = useState<SecurityAlertKind>('Suspeito');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'Suspeito' },
  });

  const onSubmit = async (data: FormData) => {
    if (!user?.bairroId) return;
    if (!user.isVerified) {
      setServerError('Apenas moradores verificados podem reportar alertas.');
      return;
    }
    setServerError(null);
    try {
      await createSecurityAlert({
        bairroId: user.bairroId,
        kind: data.kind,
        description: data.description.trim(),
        locationDescription: data.locationDescription?.trim() || undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg ?? 'Não foi possível enviar. Tente novamente.');
    }
  };

  if (!user?.isVerified) {
    return (
      <div className="max-w-xl mx-auto space-y-6 text-center py-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center text-3xl">🔒</div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-fg">Verificação necessária</h1>
          <p className="text-muted-fg">Apenas moradores verificados podem reportar alertas de segurança.</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/onboarding/cep-lookup')}>Verificar meu endereço</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up text-center py-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-3xl">✅</div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-fg">Alerta publicado</h1>
          <p className="text-muted-fg">Seus vizinhos foram avisados. Fique seguro!</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/alertas')}>Ver alertas do bairro</Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-fg">Reportar ocorrência</h1>
        <p className="text-muted-fg">Avise seus vizinhos sobre o que está acontecendo no bairro.</p>
      </header>

      {serverError && (
        <div className="rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-medium px-4 py-3">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Kind selector */}
        <div>
          <label className="block text-sm font-semibold text-fg mb-2">Tipo de ocorrência</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KIND_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { setSelectedKind(o.value); setValue('kind', o.value); }}
                className={[
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 text-left',
                  selectedKind === o.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border/50 bg-muted text-fg hover:border-primary/30',
                ].join(' ')}
              >
                <span className="text-base">{o.emoji}</span>
                {o.label}
              </button>
            ))}
          </div>
          <input type="hidden" {...register('kind')} value={selectedKind} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-fg mb-1">O que aconteceu?</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Descreva o que você viu ou presenciou..."
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium resize-none"
          />
          {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-fg mb-1">
            Onde aconteceu? <span className="text-muted-fg font-normal">(opcional)</span>
          </label>
          <input
            {...register('locationDescription')}
            placeholder="Ex: Rua das Flores, próximo ao mercado"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          />
          {errors.locationDescription && <p className="text-danger text-xs mt-1">{errors.locationDescription.message}</p>}
        </div>

        <p className="text-xs text-muted-fg">
          Seu nome será exibido junto ao alerta. Apenas relate o que você realmente viu.
        </p>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => router.push('/alertas')}>Cancelar</Button>
          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>Publicar alerta</Button>
        </div>
      </form>
    </div>
  );
}
