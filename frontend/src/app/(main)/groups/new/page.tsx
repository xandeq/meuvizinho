'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { createGroup } from '@/lib/api/groups';
import type { GroupCategory } from '@/lib/types/groups';

const schema = z.object({
  name: z.string().min(3, { message: 'Mínimo 3 caracteres' }).max(100),
  description: z.string().min(10, { message: 'Mínimo 10 caracteres' }).max(500),
  category: z.string(),
  joinPolicy: z.enum(['Open', 'Closed']),
  scope: z.enum(['Bairro', 'CrossBairro']),
});

type FormData = z.infer<typeof schema>;

export default function NewGroupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { joinPolicy: 'Open', scope: 'Bairro', category: 'Outros' },
  });

  const onSubmit = async (data: FormData) => {
    if (!user?.bairroId) return;
    const group = await createGroup({
      bairroId: user.bairroId,
      name: data.name,
      description: data.description,
      category: data.category as GroupCategory,
      joinPolicy: data.joinPolicy,
      scope: data.scope,
    });
    router.push(`/groups/${group.id}`);
  };

  return (
    <main className="container mx-auto px-4 py-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-fg mb-6">Criar Grupo</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="page-nome" className="block text-sm font-medium text-muted-fg mb-1">Nome</label>
          <input
            id="page-nome"
            {...register('name')}
            className="w-full border border-border/50 rounded-xl px-3 py-2 text-sm bg-muted focus:bg-card focus:border-primary outline-none"
          />
          {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="page-descricao" className="block text-sm font-medium text-muted-fg mb-1">Descrição</label>
          <textarea
            id="page-descricao"
            {...register('description')}
            rows={3}
            className="w-full border border-border/50 rounded-xl px-3 py-2 text-sm resize-none bg-muted focus:bg-card focus:border-primary outline-none"
          />
          {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <label htmlFor="page-categoria" className="block text-sm font-medium text-muted-fg mb-1">Categoria</label>
          <select
            id="page-categoria"
            {...register('category')}
            className="w-full border border-border/50 rounded-xl px-3 py-2 text-sm bg-muted focus:bg-card focus:border-primary outline-none"
          >
            {['Esportes', 'Animais', 'Pais', 'Seguranca', 'Jardinagem', 'Negocios', 'Cultura', 'Outros'].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </select>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" {...register('joinPolicy')} value="Open" /> Aberto
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" {...register('joinPolicy')} value="Closed" /> Fechado (aprovação)
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 text-white py-2 rounded-xl font-medium"
        >
          {isSubmitting ? 'Criando...' : 'Criar Grupo'}
        </button>
      </form>
    </main>
  );
}
