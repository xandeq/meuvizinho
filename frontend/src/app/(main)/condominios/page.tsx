'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getCondominiums, createCondominium } from '@/lib/api/community';
import type { CondominiumSummary, CondominiumStatus } from '@/lib/types/community';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_BADGE: Record<CondominiumStatus, { label: string; cls: string }> = {
  Unclaimed: { label: 'Sem síndico', cls: 'bg-muted text-muted-fg' },
  ClaimPending: { label: 'Reivindicação em análise', cls: 'bg-accent-light text-accent' },
  Claimed: { label: 'Com síndico', cls: 'bg-secondary-light text-secondary' },
};

function BuildingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
      <div className="h-4 w-40 rounded-full animate-shimmer" />
      <div className="h-3 w-full rounded-full animate-shimmer" />
      <div className="h-3 w-24 rounded-full animate-shimmer" />
    </div>
  );
}

export default function CondominiumsPage() {
  const user = useAuthStore((s) => s.user);
  const [condos, setCondos] = useState<CondominiumSummary[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const load = () => {
    if (!user?.bairroId) return;
    setLoading(true);
    getCondominiums(user.bairroId, { search: debouncedSearch || undefined })
      .then(setCondos)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user?.bairroId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getCondominiums(user.bairroId, { search: debouncedSearch || undefined })
      .then(setCondos)
      .finally(() => setLoading(false));
  }, [user?.bairroId, debouncedSearch]);

  const handleCreate = async () => {
    if (!user?.bairroId || name.trim().length < 2) {
      setFormError('Informe o nome do condomínio.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await createCondominium({
        bairroId: user.bairroId,
        name: name.trim(),
        addressLine: addressLine.trim() || undefined,
      });
      setName('');
      setAddressLine('');
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Não foi possível cadastrar.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-primary"><BuildingIcon /></span>
            <h1 className="text-3xl font-extrabold text-fg leading-tight">Condomínios</h1>
          </div>
          <p className="text-muted-fg font-medium">Prédios e condomínios do bairro. Síndicos podem assumir o perfil.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/whatsapp"><Button variant="outline" size="sm">Grupos</Button></Link>
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Fechar' : 'Adicionar'}
          </Button>
        </div>
      </header>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          <p className="font-bold text-fg">Cadastrar condomínio</p>
          {formError && <p className="text-danger text-xs">{formError}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex: Edifício Solar)"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          />
          <input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="Endereço (opcional)"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none focus:bg-card focus:border-primary font-medium"
          />
          <Button variant="primary" size="sm" loading={creating} onClick={handleCreate}>Salvar</Button>
        </div>
      )}

      <input
        type="search"
        placeholder="Buscar condomínios..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none transition-colors duration-150 focus:bg-card focus:border-primary font-medium"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : condos.length === 0 ? (
        <EmptyState
          title="Nenhum condomínio ainda"
          description={search ? `Sem resultados para "${search}".` : 'Cadastre o seu prédio ou condomínio.'}
          action={{ label: 'Adicionar', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {condos.map((c, i) => (
            <Link
              key={c.id}
              href={`/condominios/${c.id}`}
              className={`group block bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden animate-slide-up card-interactive stagger-slide-${Math.min((i % 5) + 1, 5)}`}
            >
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BuildingIcon className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-fg leading-tight group-hover:text-primary transition-colors line-clamp-1">{c.name}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[c.status].cls}`}>
                    {STATUS_BADGE[c.status].label}
                  </span>
                </div>
                {c.addressLine && <p className="text-sm text-muted-fg line-clamp-1">{c.addressLine}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs font-medium text-muted-fg">
                  <span>{c.groupCount} {c.groupCount === 1 ? 'grupo' : 'grupos'}</span>
                  {c.sindicoName && <span className="text-secondary">Síndico: {c.sindicoName}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
