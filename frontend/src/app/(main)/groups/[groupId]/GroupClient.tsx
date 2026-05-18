'use client';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getHubConnection } from '@/lib/signalr';
import { useGroupStore } from '@/stores/group-store';
import { useAuthStore } from '@/lib/auth';
import { getGroup, getGroupPosts, createGroupPost, getGroupEvents, rsvpEvent, getGroupMembers } from '@/lib/api/groups';
import type { GroupMember } from '@/lib/api/groups';
import type { GroupPost, GroupEvent } from '@/lib/types/groups';
import Avatar from '@/components/ui/Avatar';

interface PendingMember {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  joinedAt: string;
}

interface Props {
  groupId: number;
}

export default function GroupClient({ groupId }: Props) {
  const {
    posts,
    appendPosts,
    prependPost,
    resetFeed,
    incrementPage,
    page,
    hasMore,
    currentGroup,
    setCurrentGroup,
  } = useGroupStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [composerBody, setComposerBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'pending'>('feed');

  // Members tab state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);

  // Pending members tab state
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.bairronow.com.br';

  // Derive current user's role from members list
  const myMember = members.find((m) => m.userId === currentUserId);
  const myRole = myMember?.role ?? null;
  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';

  // Load group detail and initial posts
  useEffect(() => {
    resetFeed();
    Promise.all([getGroup(groupId), getGroupPosts(groupId, 1)]).then(([g, p]) => {
      setCurrentGroup(g);
      appendPosts(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Infinite scroll — load more pages
  useEffect(() => {
    if (page === 1) return;
    getGroupPosts(groupId, page).then(appendPosts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // SignalR — join group room, listen for new posts
  useEffect(() => {
    let cancelled = false;
    getHubConnection().then((hub) => {
      if (cancelled) return;
      hub.invoke('JoinGroup', groupId).catch(console.error);

      // off() before on() — idempotent on fast nav away/back
      hub.off('NewGroupPost');
      hub.off('GroupEventReminder');
      hub.on('NewGroupPost', (post: GroupPost) => { if (!cancelled) prependPost(post); });
      hub.on('GroupEventReminder', (ev: { id: number; title: string; startsAt: string }) => {
        if (!cancelled) console.info('GroupEventReminder', ev);
      });

      // Guard with `cancelled` — onreconnected has no off() equivalent, so old
      // handlers from prior mounts become no-ops via the closure flag.
      hub.onreconnected(() => {
        if (cancelled) return;
        hub.invoke('JoinGroup', groupId).catch(console.error);
      });
    });

    return () => {
      cancelled = true;
      getHubConnection().then((hub) => {
        hub.invoke('LeaveGroup', groupId).catch(console.error);
        hub.off('NewGroupPost');
        hub.off('GroupEventReminder');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Load members only when members tab is active
  useEffect(() => {
    if (activeTab !== 'members') return;
    setMembersLoading(true);
    getGroupMembers(groupId)
      .then((d) => {
        setMembers(d.items);
        setMembersTotal(d.total);
      })
      .finally(() => setMembersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupId]);

  // Load pending members only when pending tab is active
  useEffect(() => {
    if (activeTab !== 'pending') return;
    setPendingLoading(true);
    fetch(`${API}/api/v1/groups/${groupId}/pending`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d: PendingMember[]) => setPending(Array.isArray(d) ? d : []))
      .catch(() => setPending([]))
      .finally(() => setPendingLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupId]);

  const handleApprove = async (userId: string) => {
    await fetch(`${API}/api/v1/groups/${groupId}/members/${userId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setPending((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleReject = async (userId: string) => {
    await fetch(`${API}/api/v1/groups/${groupId}/members/${userId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setPending((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerBody.trim()) return;
    setSubmitting(true);
    try {
      await createGroupPost(groupId, { body: composerBody, category: 'Outros' });
      setComposerBody('');
      // SignalR will push the new post back — no manual prepend needed
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {currentGroup && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-fg">{currentGroup.name}</h1>
            <p className="text-sm text-muted-fg mt-1">{currentGroup.description}</p>
          </div>
          {/* Join button / membership status */}
          {currentGroup.myStatus === 'PendingApproval' ? (
            <button
              disabled
              className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-muted text-muted-fg cursor-default"
            >
              Solicitação enviada
            </button>
          ) : currentGroup.myStatus === 'Active' ? (
            <span className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-muted text-muted-fg">
              Membro
            </span>
          ) : (
            <button
              onClick={async () => {
                const { joinGroup } = await import('@/lib/api/groups');
                await joinGroup(groupId);
                setCurrentGroup({ ...currentGroup, myStatus: currentGroup.joinPolicy === 'Closed' ? 'PendingApproval' : 'Active' });
              }}
              className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              {currentGroup.joinPolicy === 'Closed' ? 'Solicitar entrada' : 'Entrar'}
            </button>
          )}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-4 border-b border-border mb-4">
        {(
          [
            { key: 'feed', label: 'Feed', icon: null },
            { key: 'events', label: 'Eventos', icon: null },
            {
              key: 'members',
              label: 'Membros',
              icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              ),
            },
          ] as { key: 'feed' | 'events' | 'members'; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`pb-2 text-sm font-medium flex items-center gap-1.5 ${
              activeTab === key ? 'border-b-2 border-primary text-primary' : 'text-muted-fg'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
        {isAdminOrOwner && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 text-sm font-medium flex items-center gap-1.5 ${
              activeTab === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-muted-fg'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Pendentes
            {pending.length > 0 && (
              <span className="ml-0.5 bg-danger text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {pending.length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === 'feed' && (
        <>
          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-xl border border-border shadow-sm p-4 mb-4"
          >
            <textarea
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              placeholder="Compartilhe algo com o grupo..."
              rows={3}
              className="w-full resize-none text-sm text-muted-fg outline-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !composerBody.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-xl"
              >
                {submitting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>

          {/* Posts */}
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-fg text-xs">
                    {p.author.displayName?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{p.author.displayName}</p>
                    <p className="text-xs text-muted-fg">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-fg">{p.body}</p>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => incrementPage()}
              className="mt-4 w-full text-sm text-primary py-2 border border-primary/20 rounded-xl hover:bg-primary/5"
            >
              Carregar mais
            </button>
          )}
        </>
      )}

      {activeTab === 'events' && <GroupEventsTab groupId={groupId} />}

      {activeTab === 'pending' && isAdminOrOwner && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-fg">Solicitações de entrada</p>
            {!pendingLoading && (
              <span className="text-xs font-bold bg-muted text-muted-fg px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          {/* Skeleton loader */}
          {pendingLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-32" />
                    <div className="h-2.5 bg-muted rounded w-20" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-muted rounded-xl" />
                    <div className="h-8 w-20 bg-muted rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!pendingLoading && pending.length === 0 && (
            <div className="text-center py-10">
              <svg className="w-10 h-10 text-muted-fg mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <p className="text-sm text-muted-fg">Nenhuma solicitação pendente</p>
            </div>
          )}

          {/* Pending list */}
          {!pendingLoading && pending.map((m) => (
            <div key={m.userId} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
              <Avatar src={m.photoUrl} name={m.displayName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-fg truncate">
                    {m.displayName ?? 'Vizinho'}
                  </p>
                  {m.isVerified && (
                    <span className="shrink-0 text-[10px] font-bold bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full">
                      Verificado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-fg">
                  Há {formatDistanceToNow(new Date(m.joinedAt), { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleApprove(m.userId)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => handleReject(m.userId)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-danger text-danger hover:bg-danger/10 transition-colors"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-3">
          {/* Header with total count */}
          <p className="text-sm font-medium text-muted-fg">
            {membersLoading ? 'Carregando...' : `${membersTotal} membros`}
          </p>

          {/* Skeleton loader */}
          {membersLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-32" />
                    <div className="h-2.5 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!membersLoading && members.length === 0 && (
            <p className="text-sm text-muted-fg text-center py-8">Nenhum membro encontrado.</p>
          )}

          {/* Members list */}
          {!membersLoading && members.map((m) => (
            <div key={m.userId} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
              <Avatar src={m.photoUrl} name={m.displayName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">
                  {m.displayName ?? 'Vizinho'}
                </p>
                <p className="text-xs text-muted-fg">
                  Entrou em {new Date(m.joinedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span
                className={[
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  m.role === 'owner'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : m.role === 'admin'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'bg-muted text-muted-fg',
                ].join(' ')}
              >
                {m.role === 'owner' ? 'Criador' : m.role === 'admin' ? 'Admin' : 'Membro'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Inline events tab (GRP-007)
function GroupEventsTab({ groupId }: { groupId: number }) {
  const [events, setEvents] = useState<GroupEvent[]>([]);

  useEffect(() => {
    getGroupEvents(groupId).then(setEvents);
  }, [groupId]);

  const handleRsvp = (ev: GroupEvent) => {
    rsvpEvent(groupId, ev.id, !ev.myRsvp)
      .then(() =>
        setEvents((evs) =>
          evs.map((e) =>
            e.id === ev.id
              ? { ...e, myRsvp: !e.myRsvp, rsvpCount: e.rsvpCount + (!e.myRsvp ? 1 : -1) }
              : e
          )
        )
      )
      .catch(console.error);
  };

  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <div key={ev.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
          <p className="font-medium text-fg">{ev.title}</p>
          {ev.location && <p className="text-sm text-muted-fg">{ev.location}</p>}
          <p className="text-sm text-muted-fg">{new Date(ev.startsAt).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-fg">{ev.rsvpCount} confirmados</p>
          <button
            onClick={() => handleRsvp(ev)}
            className={`mt-2 text-sm px-3 py-1 rounded-xl ${
              ev.myRsvp ? 'bg-secondary text-secondary-fg' : 'bg-muted text-muted-fg'
            }`}
          >
            {ev.myRsvp ? 'Confirmado' : 'Confirmar presença'}
          </button>
        </div>
      ))}
      {events.length === 0 && (
        <p className="text-sm text-muted-fg text-center py-8">Nenhum evento criado ainda.</p>
      )}
    </div>
  );
}
