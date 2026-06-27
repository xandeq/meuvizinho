'use client';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getHubConnection } from '@/lib/signalr';
import { useGroupStore } from '@/stores/group-store';
import { useAuthStore } from '@/lib/auth';
import { getGroup, getGroupPosts, createGroupPost, getGroupEvents, rsvpEvent, getGroupMembers, toggleGroupPostLike, createGroupEvent, deleteGroupPost } from '@/lib/api/groups';
import type { GroupMember } from '@/lib/api/groups';
import type { GroupPost, GroupEvent, GroupPoll } from '@/lib/types/groups';
import Avatar from '@/components/ui/Avatar';

interface PendingMember {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  joinedAt: string;
}

export default function GroupClient() {
  // Read groupId from window.location — Next.js static export serves placeholder HTML
  // for all /groups/{id}/ URLs, so useParams()/usePathname() return 'placeholder'.
  // window.location always reflects the real browser URL.
  const [groupId, setGroupId] = useState<number>(0);
  useEffect(() => {
    const match = window.location.pathname.match(/\/groups\/(\d+)/);
    if (match) setGroupId(parseInt(match[1], 10));
  }, []);
  const {
    posts,
    appendPosts,
    prependPost,
    updatePost,
    removePost,
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
  const [activeTab, setActiveTab] = useState<'feed' | 'polls' | 'events' | 'members' | 'pending'>('feed');

  // Polls tab state
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(false);

  // Members tab state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);

  // Pending members tab state
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.bairronow.com.br';

  // Derive role from group detail (always available) with members-tab fallback
  const myMember = members.find((m) => m.userId === currentUserId);
  const myRoleFromMembers = myMember?.role ?? null;
  const myRole = currentGroup?.myRole ?? myRoleFromMembers;
  const isAdminOrOwner = myRole === 'Owner' || myRole === 'Admin' || myRole === 'owner' || myRole === 'admin';

  // Load group detail and initial posts
  useEffect(() => {
    if (!groupId) return;
    resetFeed();
    Promise.all([getGroup(groupId), getGroupPosts(groupId, 1)]).then(([g, p]) => {
      setCurrentGroup(g);
      appendPosts(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Infinite scroll — load more pages
  useEffect(() => {
    if (!groupId || page === 1) return;
    getGroupPosts(groupId, page).then(appendPosts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // SignalR — join group room, listen for new posts
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    getHubConnection().then((hub) => {
      if (cancelled) return;
      hub.invoke('JoinGroup', groupId).catch(console.error);

      // off() before on() — idempotent on fast nav away/back
      hub.off('NewGroupPost');
      hub.off('GroupEventReminder');
      hub.off('NewGroupPoll');
      hub.off('GroupPollUpdated');
      hub.on('NewGroupPost', (post: GroupPost) => { if (!cancelled) prependPost(post); });
      hub.on('GroupEventReminder', (ev: { id: number; title: string; startsAt: string }) => {
        if (!cancelled) console.info('GroupEventReminder', ev);
      });
      hub.on('NewGroupPoll', (poll: GroupPoll) => {
        if (!cancelled) setPolls((prev) => [poll, ...prev]);
      });
      hub.on('GroupPollUpdated', (poll: GroupPoll) => {
        if (!cancelled) setPolls((prev) => prev.map((p) => p.id === poll.id ? poll : p));
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
        hub.off('NewGroupPoll');
        hub.off('GroupPollUpdated');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Load members only when members tab is active
  useEffect(() => {
    if (!groupId || activeTab !== 'members') return;
    setMembersLoading(true);
    getGroupMembers(groupId)
      .then((d) => {
        setMembers(d.items);
        setMembersTotal(d.total);
      })
      .finally(() => setMembersLoading(false));
  }, [activeTab, groupId]);

  // Load polls when polls tab is active
  useEffect(() => {
    if (!groupId || activeTab !== 'polls') return;
    setPollsLoading(true);
    fetch(`${API}/api/v1/groups/${groupId}/polls`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d: GroupPoll[]) => setPolls(Array.isArray(d) ? d : []))
      .catch(() => setPolls([]))
      .finally(() => setPollsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupId]);

  // Load pending members only when pending tab is active
  useEffect(() => {
    if (!groupId || activeTab !== 'pending') return;
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

  const handleToggleLike = async (postId: number, currentlyLiked: boolean, currentCount: number) => {
    // Optimistic update
    updatePost(postId, {
      isLikedByMe: !currentlyLiked,
      likeCount: currentlyLiked ? currentCount - 1 : currentCount + 1,
    });
    try {
      await toggleGroupPostLike(groupId, postId);
    } catch {
      // Rollback on failure
      updatePost(postId, { isLikedByMe: currentlyLiked, likeCount: currentCount });
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Excluir esta publicação?')) return;
    try {
      await deleteGroupPost(groupId, postId);
      removePost(postId);
    } catch {
      // best-effort — post stays in list if delete fails
    }
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

      {/* Tab nav — overflow-x-auto prevents wrapping on narrow screens (iPhone SE) */}
      <div className="flex gap-4 border-b border-border mb-4 overflow-x-auto">
        {(
          [
            { key: 'feed', label: 'Feed', icon: null },
            {
              key: 'polls',
              label: 'Enquetes',
              icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              ),
            },
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
          ] as { key: 'feed' | 'polls' | 'events' | 'members'; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`shrink-0 pb-2 text-sm font-medium flex items-center gap-1.5 ${
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
            className={`shrink-0 pb-2 text-sm font-medium flex items-center gap-1.5 ${
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
          {/* Composer — only active members can post */}
          {currentGroup?.myStatus === 'Active' && (
            <form
              onSubmit={handleSubmit}
              className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 mb-4"
            >
              <textarea
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value.slice(0, 2000))}
                placeholder="Compartilhe algo com o grupo..."
                rows={3}
                maxLength={2000}
                className="w-full resize-none text-sm text-muted-fg outline-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className={['text-xs', composerBody.length > 1800 ? 'text-danger font-semibold' : 'text-muted-fg'].join(' ')}>
                  {composerBody.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={submitting || !composerBody.trim()}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-xl"
                >
                  {submitting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          )}

          {/* Posts */}
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar src={p.author.photoUrl ?? null} name={p.author.displayName} size="sm" verified={p.author.isVerified} />
                  <div>
                    <p className="text-sm font-medium text-fg">{p.author.displayName}</p>
                    <p className="text-xs text-muted-fg">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-fg leading-relaxed">{p.body}</p>
                {/* Post actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    aria-label={p.isLikedByMe ? 'Remover curtida' : 'Curtir publicação'}
                    aria-pressed={p.isLikedByMe}
                    onClick={() => handleToggleLike(p.id, p.isLikedByMe, p.likeCount)}
                    className={[
                      'flex items-center gap-1.5 text-xs font-medium transition-colors',
                      p.isLikedByMe ? 'text-danger' : 'text-muted-fg hover:text-danger',
                    ].join(' ')}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={p.isLikedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {p.likeCount > 0 && <span>{p.likeCount}</span>}
                  </button>
                  <span className="flex items-center gap-1.5 text-xs text-muted-fg">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {p.commentCount > 0 && <span>{p.commentCount}</span>}
                  </span>
                  {(p.authorId === currentUserId || isAdminOrOwner) && (
                    <button
                      type="button"
                      aria-label="Excluir publicação"
                      onClick={() => handleDeletePost(p.id)}
                      className="ml-auto text-danger/40 hover:text-danger transition-colors p-1 rounded-lg"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => incrementPage()}
              className="mt-4 w-full text-sm text-primary py-2 border border-primary/20 rounded-xl hover:bg-primary/5"
            >
              Carregar mais
            </button>
          )}
        </>
      )}

      {activeTab === 'polls' && (
        <GroupPollsTab
          groupId={groupId}
          polls={polls}
          pollsLoading={pollsLoading}
          currentUserId={currentUserId}
          accessToken={accessToken}
          API={API}
          isMember={currentGroup?.myStatus === 'Active'}
          isAdminOrOwner={isAdminOrOwner}
          onPollCreated={(p) => setPolls((prev) => [p, ...prev])}
          onPollUpdated={(p) => setPolls((prev) => prev.map((x) => x.id === p.id ? p : x))}
          onPollDeleted={(id) => setPolls((prev) => prev.filter((x) => x.id !== id))}
        />
      )}

      {activeTab === 'events' && (
        <GroupEventsTab
          groupId={groupId}
          isMember={currentGroup?.myStatus === 'Active'}
          joinPolicy={currentGroup?.joinPolicy}
        />
      )}

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
                <div key={i} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-center gap-3 animate-pulse">
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
            <div key={m.userId} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-center gap-3">
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
          {membersLoading ? (
            <div className="h-4 bg-muted rounded w-20 animate-pulse" />
          ) : (
            <p className="text-sm font-medium text-muted-fg">{membersTotal} membros</p>
          )}

          {/* Skeleton loader */}
          {membersLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-center gap-3 animate-pulse">
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
            <div key={m.userId} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-center gap-3">
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
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80'
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

// Inline polls tab (Wave O)
function GroupPollsTab({
  groupId,
  polls,
  pollsLoading,
  currentUserId,
  accessToken,
  API,
  isMember,
  isAdminOrOwner,
  onPollCreated,
  onPollUpdated,
  onPollDeleted,
}: {
  groupId: number;
  polls: GroupPoll[];
  pollsLoading: boolean;
  currentUserId: string | undefined;
  accessToken: string | null;
  API: string;
  isMember: boolean;
  isAdminOrOwner: boolean;
  onPollCreated: (p: GroupPoll) => void;
  onPollUpdated: (p: GroupPoll) => void;
  onPollDeleted: (id: number) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(() => [
    { id: crypto.randomUUID(), text: '' },
    { id: crypto.randomUUID(), text: '' },
  ]);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 6) setOptions((o) => [...o, { id: crypto.randomUUID(), text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length > 2) setOptions((o) => o.filter((opt) => opt.id !== id));
  };

  const updateOption = (id: string, text: string) =>
    setOptions((o) => o.map((opt) => (opt.id === id ? { ...opt, text } : opt)));

  const resetForm = () => {
    setCreating(false);
    setQuestion('');
    setOptions([
      { id: crypto.randomUUID(), text: '' },
      { id: crypto.randomUUID(), text: '' },
    ]);
    setExpiresAt('');
  };

  const handleCreate = async () => {
    const validOpts = options.map((o) => o.text.trim()).filter(Boolean);
    if (!question.trim() || validOpts.length < 2) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/v1/groups/${groupId}/polls`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), options: validOpts, expiresAt: expiresAt || null }),
      });
      if (res.ok) {
        onPollCreated(await res.json());
        resetForm();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (poll: GroupPoll, optionId: number) => {
    if (votingId !== null || poll.isClosed) return;
    setVotingId(poll.id);
    try {
      const isToggle = poll.userVoteOptionId === optionId;
      const method = isToggle ? 'DELETE' : 'POST';
      const body = isToggle ? undefined : JSON.stringify({ optionId });
      const res = await fetch(`${API}/api/v1/groups/${groupId}/polls/${poll.id}/vote`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body,
      });
      if (res.ok && res.status !== 204) onPollUpdated(await res.json());
    } finally {
      setVotingId(null);
    }
  };

  const handleClose = async (pollId: number) => {
    const res = await fetch(`${API}/api/v1/groups/${groupId}/polls/${pollId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      setPollError(null);
      if (res.status === 204) {
        const poll = polls.find((p) => p.id === pollId);
        if (poll) onPollUpdated({ ...poll, isClosed: true });
      } else {
        onPollUpdated(await res.json());
      }
    } else {
      setPollError('Não foi possível encerrar a enquete.');
    }
  };

  const handleDelete = async (pollId: number) => {
    const res = await fetch(`${API}/api/v1/groups/${groupId}/polls/${pollId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      setPollError(null);
      onPollDeleted(pollId);
    } else {
      setPollError('Não foi possível remover a enquete.');
    }
  };

  const isPollExpired = (p: GroupPoll) =>
    p.expiresAt != null && new Date(p.expiresAt) < new Date();

  const canManage = (p: GroupPoll) =>
    isAdminOrOwner || p.createdByUserId === currentUserId;

  return (
    <div className="space-y-4">
      {/* Inline error banner for close/delete failures */}
      {pollError && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-danger/10 border border-danger/20 px-3 py-2.5 text-sm text-danger">
          <span>{pollError}</span>
          <button
            onClick={() => setPollError(null)}
            aria-label="Fechar"
            className="shrink-0 text-danger/70 hover:text-danger transition-colors p-0.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Create button */}
      {isMember && !creating && (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/60 text-sm font-semibold text-muted-fg hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Criar enquete
        </button>
      )}

      {/* Creation form */}
      {creating && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          <p className="font-semibold text-fg text-sm">Nova enquete</p>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Pergunta</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual horário preferem para o evento?"
              maxLength={200}
              className="w-full text-sm rounded-xl border border-border/50 bg-muted px-3 py-2 outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-right text-xs text-muted-fg mt-0.5">{question.length}/200</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Opções ({options.length}/6)</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    value={opt.text}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`Opção ${i + 1}`}
                    maxLength={100}
                    className="flex-1 text-sm rounded-xl border border-border/50 bg-muted px-3 py-2 outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(opt.id)}
                      aria-label="Remover opção"
                      className="text-danger hover:text-danger/70 p-1 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                onClick={addOption}
                className="mt-2 text-xs text-primary flex items-center gap-1 hover:text-primary/70 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar opção
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Encerrar automaticamente (opcional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="text-sm rounded-xl border border-border/50 bg-muted px-3 py-2 outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={resetForm}
              className="text-sm px-4 py-2 rounded-xl text-muted-fg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !question.trim() || options.filter((o) => o.text.trim()).length < 2}
              className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {submitting ? 'Publicando...' : 'Publicar enquete'}
            </button>
          </div>
        </div>
      )}

      {/* Skeleton loader */}
      {pollsLoading && (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="space-y-2">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-9 bg-muted rounded-xl" />
                ))}
              </div>
              <div className="h-3 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!pollsLoading && polls.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-muted-fg mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <p className="text-sm font-medium text-muted-fg">Nenhuma enquete ainda</p>
          {isMember && (
            <p className="text-xs text-muted-fg/70 mt-1">Seja o primeiro a criar uma enquete</p>
          )}
        </div>
      )}

      {/* Poll cards */}
      {!pollsLoading && polls.map((poll) => {
        const closed = poll.isClosed || isPollExpired(poll);
        const isVoting = votingId === poll.id;
        return (
          <div key={poll.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1">
                <p className="font-medium text-fg text-sm leading-snug break-words">{poll.question}</p>
                {poll.createdByName && (
                  <p className="text-xs text-muted-fg mt-0.5">Por {poll.createdByName}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {closed ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-fg">
                    {poll.isClosed ? 'Encerrada' : 'Expirada'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                    Aberta
                  </span>
                )}
                {canManage(poll) && !closed && (
                  <button
                    onClick={() => handleClose(poll.id)}
                    title="Encerrar enquete"
                    className="text-muted-fg hover:text-fg p-1 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                  </button>
                )}
                {canManage(poll) && (
                  <button
                    onClick={() => handleDelete(poll.id)}
                    title="Remover enquete"
                    className="text-danger/40 hover:text-danger p-1 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {poll.options.map((opt) => {
                const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
                const isMyVote = poll.userVoteOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(poll, opt.id)}
                    disabled={closed || isVoting}
                    className={[
                      'relative w-full text-left rounded-xl border overflow-hidden transition-all',
                      closed || isVoting ? 'cursor-default' : 'hover:border-primary/50',
                      isMyVote ? 'border-primary bg-primary/5' : 'border-border',
                    ].join(' ')}
                  >
                    {/* Animated progress fill */}
                    <div
                      className={[
                        'absolute inset-y-0 left-0 transition-[width] duration-500',
                        isMyVote ? 'bg-primary/12' : 'bg-muted/60',
                      ].join(' ')}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {isMyVote && (
                          <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                        <span className={`text-sm ${isMyVote ? 'font-semibold text-primary' : 'text-fg'}`}>
                          {opt.text}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${isMyVote ? 'text-primary' : 'text-muted-fg'}`}>
                        {pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-fg">
                {poll.totalVotes} voto{poll.totalVotes !== 1 ? 's' : ''}
              </p>
              {poll.expiresAt && !closed && (
                <p className="text-xs text-muted-fg">
                  Encerra {formatDistanceToNow(new Date(poll.expiresAt), { locale: ptBR, addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Inline events tab (GRP-007)
function GroupEventsTab({ groupId, isMember, joinPolicy }: { groupId: number; isMember?: boolean; joinPolicy?: string }) {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEventsLoading(true);
    setEventsError(null);
    getGroupEvents(groupId)
      .then(setEvents)
      .catch(() => setEventsError('Não foi possível carregar os eventos.'))
      .finally(() => setEventsLoading(false));
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) { setCreateError('O título é obrigatório.'); return; }
    if (new Date(newStartsAt) <= new Date()) { setCreateError('A data de início deve ser no futuro.'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createGroupEvent(groupId, {
        title,
        startsAt: new Date(newStartsAt).toISOString(),
        location: newLocation.trim() || undefined,
      });
      setEvents((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewTitle('');
      setNewStartsAt('');
      setNewLocation('');
    } catch {
      setCreateError('Não foi possível criar o evento. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  if (eventsLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="h-9 bg-muted rounded-xl w-36 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (eventsError) {
    return (
      <div className="text-center py-10 space-y-2">
        <svg className="w-10 h-10 text-danger/60 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
        <p className="text-sm text-danger font-medium">{eventsError}</p>
        <button
          type="button"
          onClick={() => {
            setEventsLoading(true);
            setEventsError(null);
            getGroupEvents(groupId)
              .then(setEvents)
              .catch(() => setEventsError('Não foi possível carregar os eventos.'))
              .finally(() => setEventsLoading(false));
          }}
          className="text-xs text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create event button */}
      {isMember && !showCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/60 text-sm font-semibold text-muted-fg hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
          </svg>
          Criar evento
        </button>
      )}

      {/* Event creation form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
          <p className="font-semibold text-fg text-sm">Novo evento</p>

          {createError && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{createError}</p>
          )}

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Título *</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value.slice(0, 120))}
              placeholder="Ex: Churrasco do bairro"
              maxLength={120}
              required
              className="w-full text-sm rounded-xl border border-border/50 bg-muted px-3 py-2 outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-right text-xs text-muted-fg mt-0.5">{newTitle.length}/120</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Data e hora *</label>
            <input
              type="datetime-local"
              value={newStartsAt}
              onChange={(e) => setNewStartsAt(e.target.value)}
              required
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              className="w-full text-sm rounded-xl border border-border/50 bg-muted px-3 py-2 outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-fg mb-1 block">Local (opcional)</label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value.slice(0, 200))}
              placeholder="Ex: Praça central, Casa do João"
              maxLength={200}
              className="w-full text-sm rounded-xl border border-border/50 bg-muted px-3 py-2 outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateError(null); setNewTitle(''); setNewStartsAt(''); setNewLocation(''); }}
              className="text-sm px-4 py-2 rounded-xl text-muted-fg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !newTitle.trim() || !newStartsAt}
              className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {creating ? 'Criando...' : 'Criar evento'}
            </button>
          </div>
        </form>
      )}

      {events.map((ev) => (
        <div key={ev.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <p className="font-medium text-fg">{ev.title}</p>
          {ev.location && <p className="text-sm text-muted-fg">{ev.location}</p>}
          <p className="text-sm text-muted-fg">{new Date(ev.startsAt).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-fg">{ev.rsvpCount} confirmados</p>
          {(joinPolicy !== 'Closed' || isMember) && (
            <button
              type="button"
              onClick={() => handleRsvp(ev)}
              className={`mt-2 text-sm px-3 py-2.5 rounded-xl min-h-[44px] ${
                ev.myRsvp ? 'bg-secondary text-white' : 'bg-muted text-muted-fg'
              }`}
            >
              {ev.myRsvp ? 'Confirmado' : 'Confirmar presença'}
            </button>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <div className="text-center py-10">
          <svg className="w-10 h-10 text-muted-fg mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p className="text-sm text-muted-fg">Nenhum evento criado ainda.</p>
        </div>
      )}
    </div>
  );
}
