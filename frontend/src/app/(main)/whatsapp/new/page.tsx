'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { submitWhatsAppGroup } from '@/lib/api/community';
import type { WhatsAppGroupKind } from '@/lib/types/community';
import Button from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2, { message: 'Mínimo 2 caracteres' }).max(120),
  inviteUrl: z
    .string()
    .url({ message: 'Informe uma URL válida' })
    .refine((u) => /^https:\/\/chat\.whatsapp\.com\/.{6,}/i.test(u.trim()), {
      message: 'Cole o link de convite do WhatsApp (https://chat.whatsapp.com/...)',
    }),
  kind: z.enum(['Predio', 'Condominio', 'Rua', 'Bairro', 'Comercio', 'Interesse']),
  description: z.string().max(500).optional(),
  memberCountApprox: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{1,6}$/.test(v), { message: 'Apenas números' }),
});
type FormData = z.infer<typeof schema>;

const KIND_OPTIONS: { value: WhatsAppGroupKind; label: string }[] = [
  { value: 'Condominio', label: 'Condomínio' },
  { value: 'Predio', label: 'Prédio' },
  { value: 'Rua', label: 'Rua' },
  { value: 'Bairro', label: 'Bairro' },
  { value: 'Comercio', label: 'Comércio' },
  { value: 'Interesse', label: 'Interesse' },
];

export default function NewWhatsAppGroupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'Condominio' },
  });

  const onSubmit = async (data: FormData) => {
    if (!user?.bairroId) return;
    setServerError(null);
    try {
      await submitWhatsAppGroup({
        bairroId: user.bairroId,
        name: data.name.trim(),
        inviteUrl: data.inviteUrl.trim(),
        kind: data.kind,
        description: data.description?.trim() || undefined,
        memberCountApprox: data.memberCountApprox ? parseInt(data.memberCountApprox, 10) : undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg ?? 'Não foi possível enviar. Tente novamente.');
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up text-center py-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary-light text-secondary flex items-center justify-center">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-fg">Enviado para verificação</h1>
          <p className="text-muted-fg">
            Nossa equipe vai conferir o link e publicar o grupo no diretório do bairro.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/whatsapp')}>
          Voltar ao diretório
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-fg">Adicionar grupo de WhatsApp</h1>
        <p className="text-muted-fg">
          Cadastre o grupo do seu condomínio, prédio ou rua. Ele passa por verificação antes de aparecer.
        </p>
      </header>

      {serverError && (
        <div className="rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-medium px-4 py-3">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="page-nome-do-grupo" className="block text-sm font-semibold text-fg mb-1">Nome do grupo</label>
          <input
            id="page-nome-do-grupo"
            {...register('name')}
            placeholder="Ex: Condomínio Edifício Solar"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          />
          {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="page-link-de-convite-do-whatsapp" className="block text-sm font-semibold text-fg mb-1">Link de convite do WhatsApp</label>
          <input
            id="page-link-de-convite-do-whatsapp"
            {...register('inviteUrl')}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          />
          {errors.inviteUrl && <p className="text-danger text-xs mt-1">{errors.inviteUrl.message}</p>}
        </div>

        <div>
          <label htmlFor="page-tipo" className="block text-sm font-semibold text-fg mb-1">Tipo</label>
          <select
            id="page-tipo"
            {...register('kind')}
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-fg mb-1">Descrição <span className="text-muted-fg font-normal">(opcional)</span></label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Do que se trata o grupo, regras, etc."
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium resize-none"
          />
          {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-fg mb-1">Nº aproximado de membros <span className="text-muted-fg font-normal">(opcional)</span></label>
          <input
            {...register('memberCountApprox')}
            type="number"
            inputMode="numeric"
            placeholder="120"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          />
          {errors.memberCountApprox && <p className="text-danger text-xs mt-1">{errors.memberCountApprox.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => router.push('/whatsapp')}>Cancelar</Button>
          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>Enviar para verificação</Button>
        </div>
      </form>
    </div>
  );
}
