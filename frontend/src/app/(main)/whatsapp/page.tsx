'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getWhatsAppGroups, clickWhatsAppGroup } from '@/lib/api/community';
import type { WhatsAppGroupSummary, WhatsAppGroupKind } from '@/lib/types/community';
import { WHATSAPP_KIND_LABELS } from '@/lib/types/community';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const KIND_FILTERS: { code: string; label: string }[] = [
  { code: '', label: 'Todos' },
  { code: 'Condominio', label: 'Condomínio' },
  { code: 'Predio', label: 'Prédio' },
  { code: 'Rua', label: 'Rua' },
  { code: 'Bairro', label: 'Bairro' },
  { code: 'Comercio', label: 'Comércio' },
  { code: 'Interesse', label: 'Interesse' },
];

const KIND_COLORS: Record<WhatsAppGroupKind, string> = {
  Condominio: 'bg-secondary-light text-secondary',
  Predio: 'bg-secondary-light text-secondary',
  Rua: 'bg-primary-light text-primary-hover',
  Bairro: 'bg-primary-light text-primary-hover',
  Comercio: 'bg-accent-light text-accent',
  Interesse: 'bg-muted text-muted-fg',
};

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-secondary-light text-secondary">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Oficial
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl animate-shimmer" />
        <div className="h-4 w-36 rounded-full animate-shimmer" />
      </div>
      <div className="h-3 w-full rounded-full animate-shimmer" />
      <div className="h-3 w-3/4 rounded-full animate-shimmer" />
      <div className="h-9 w-full rounded-xl animate-shimmer" />
    </div>
  );
}

export default function WhatsAppDirectoryPage() {
  const user = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<WhatsAppGroupSummary[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  useEffect(() => {
    if (!user?.bairroId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getWhatsAppGroups(user.bairroId, { search: debouncedSearch || undefined, kind: kind || undefined })
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [user?.bairroId, debouncedSearch, kind]);

  const handleJoin = async (g: WhatsAppGroupSummary) => {
    setOpening(g.id);
    try {
      const { inviteUrl, clickCount } = await clickWhatsAppGroup(g.id);
      setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, clickCount } : x)));
      window.open(inviteUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // silencioso — grupo pode ter saído do ar
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-secondary"><WhatsAppIcon /></span>
            <h1 className="text-3xl font-extrabold text-fg leading-tight">Grupos de WhatsApp</h1>
          </div>
          <p className="text-muted-fg font-medium">
            Os grupos do seu bairro, condomínio e prédio, verificados e num lugar só.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/condominios">
            <Button variant="outline" size="sm">Condomínios</Button>
          </Link>
          <Link href="/whatsapp/new">
            <Button variant="primary" size="sm">
              <PlusIcon />
              Adicionar
            </Button>
          </Link>
        </div>
      </header>

      {/* Search */}
      <input
        type="search"
        placeholder="Buscar grupos..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none transition-colors duration-150 focus:bg-card focus:border-primary font-medium"
      />

      {/* Kind filter chips */}
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.code}
            onClick={() => setKind(f.code)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
              kind === f.code
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-muted text-muted-fg border-border/50 hover:border-primary/30 hover:text-primary',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Nenhum grupo ainda"
          description={search ? `Sem resultados para "${search}".` : 'Conhece um grupo do bairro? Seja o primeiro a cadastrar.'}
          action={{ label: 'Adicionar grupo', onClick: () => window.location.assign('/whatsapp/new') }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g, i) => (
            <div
              key={g.id}
              data-testid="whatsapp-card"
              className={`group flex flex-col bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden animate-slide-up card-interactive stagger-slide-${Math.min((i % 5) + 1, 5)}`}
            >
              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-secondary-light text-secondary flex items-center justify-center shrink-0">
                      <WhatsAppIcon className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-fg leading-tight line-clamp-1">{g.name}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${KIND_COLORS[g.kind]}`}>
                    {WHATSAPP_KIND_LABELS[g.kind]}
                  </span>
                </div>

                {g.description && (
                  <p className="text-sm text-muted-fg line-clamp-2 leading-relaxed">{g.description}</p>
                )}

                {g.condominiumName && (
                  <Link
                    href={g.condominiumId ? `/condominios/${g.condominiumId}` : '/condominios'}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    🏢 {g.condominiumName}
                  </Link>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {g.isManagedByPlatform && <VerifiedBadge />}
                  {g.memberCountApprox != null && (
                    <span className="text-xs text-muted-fg font-medium">
                      ~{g.memberCountApprox} membros
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  loading={opening === g.id}
                  onClick={() => handleJoin(g)}
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Entrar no grupo
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
