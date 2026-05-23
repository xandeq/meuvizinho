'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { getGroups } from '@/lib/api/groups';
import type { Group, GroupCategory } from '@/lib/types/groups';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const CATEGORY_COLORS: Record<GroupCategory, string> = {
  Esportes:   'bg-secondary/15 text-secondary',
  Animais:    'bg-accent/15 text-accent',
  Pais:       'bg-secondary/15 text-secondary',
  Seguranca:  'bg-danger/10 text-danger',
  Jardinagem: 'bg-secondary/15 text-secondary',
  Negocios:   'bg-primary/10 text-primary',
  Cultura:    'bg-accent/15 text-accent',
  Outros:     'bg-muted text-muted-fg',
};

function GroupsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3 animate-pulse">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-36 rounded-full bg-muted" />
        <div className="h-3 w-full rounded-full bg-muted" />
        <div className="h-3 w-3/4 rounded-full bg-muted" />
      </div>
      <div className="h-3 w-20 rounded-full bg-muted" />
    </div>
  );
}

export default function GroupsPage() {
  const user = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.bairroId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getGroups(user.bairroId, { search: search || undefined })
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [user?.bairroId, search]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-primary"><GroupsIcon /></span>
            <h1 className="text-3xl font-extrabold text-fg leading-tight">Grupos do Bairro</h1>
          </div>
          <p className="text-muted-fg font-medium">Comunidades organizadas por interesse</p>
        </div>
        <Link href="/groups/new">
          <Button variant="primary" size="sm">
            <PlusIcon />
            Criar Grupo
          </Button>
        </Link>
      </header>

      {/* Search */}
      <input
        type="search"
        placeholder="Buscar grupos..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none transition-colors duration-150 focus:bg-card focus:border-primary font-medium"
      />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Nenhum grupo encontrado"
          description={search ? `Sem resultados para "${search}".` : 'Seja o primeiro a criar um grupo no seu bairro.'}
          action={{ label: 'Criar grupo', onClick: () => window.location.assign('/groups/new') }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              data-testid="group-card"
              className="group block bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-primary/30 transition-all duration-300 ease-out"
            >
              {/* Cover image */}
              {g.coverImageUrl ? (
                <Image
                  unoptimized
                  src={g.coverImageUrl}
                  alt={g.name}
                  width={400}
                  height={96}
                  className="h-24 w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              ) : (
                <div className="h-24 w-full bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5" />
              )}

              <div className="p-4 space-y-2">
                {/* Name + category */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-fg leading-tight group-hover:text-primary transition-colors line-clamp-1">
                    {g.name}
                  </p>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[g.category]}`}>
                    {g.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-fg line-clamp-2 leading-relaxed">{g.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-fg font-medium">
                    {g.memberCount} {g.memberCount === 1 ? 'membro' : 'membros'}
                  </span>
                  <span className={`text-xs font-semibold ${g.joinPolicy === 'Open' ? 'text-secondary' : 'text-muted-fg'}`}>
                    {g.joinPolicy === 'Open' ? '🔓 Aberto' : '🔒 Fechado'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
