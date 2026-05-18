'use client';
import { useEffect, useState } from 'react';
import { getHubConnection } from '@/lib/signalr';
import { useGroupStore } from '@/stores/group-store';
import { getGroup, getGroupPosts, createGroupPost, getGroupEvents, rsvpEvent, getGroupMembers } from '@/lib/api/groups';
import type { GroupMember } from '@/lib/api/groups';
import type { GroupPost, GroupEvent } from '@/lib/types/groups';
import Avatar from '@/components/ui/Avatar';

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
  const [composerBody, setComposerBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members'>('feed');

  // Members tab state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);

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
    let cleanup = false;
    getHubConnection().then((hub) => {
      if (cleanup) return;
      hub.invoke('JoinGroup', groupId).catch(console.error);
      hub.on('NewGroupPost', (post: GroupPost) => prependPost(post));
      hub.on('GroupEventReminder', (ev: { id: number; title: string; startsAt: string }) => {
        console.info('GroupEventReminder', ev);
      });

      // Reconnect: re-join after hub reconnects (Pitfall 6)
      const onReconnected = () => hub.invoke('JoinGroup', groupId).catch(console.error);
      hub.onreconnected(onReconnected);
    });

    return () => {
      cleanup = true;
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
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-fg">{currentGroup.name}</h1>
          <p className="text-sm text-muted-fg mt-1">{currentGroup.description}</p>
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
            onClick={() => setActiveTab(key)}
            className={`pb-2 text-sm font-medium flex items-center gap-1.5 ${
              activeTab === key ? 'border-b-2 border-primary text-primary' : 'text-muted-fg'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
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
