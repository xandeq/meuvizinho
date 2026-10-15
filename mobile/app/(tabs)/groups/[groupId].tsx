import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKeyboardOverlap } from '../../../src/lib/useKeyboardHeight';
import { goBackOr } from '../../../src/lib/navigation';
import { getHubConnection } from '@/lib/signalr';
import { useGroupStore } from '@/features/groups/useGroupStore';
import {
  getGroup, getGroupPosts, createGroupPost, getGroupEvents, rsvpEvent, joinGroup, leaveGroup,
} from '@/features/groups/groupsApi';
import type { GroupPost, GroupEvent } from '@/features/groups/groupsApi';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';
import { VerifiedBadge } from '../../../src/components/VerifiedBadge';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { apiErrorMessage } from '../../../src/lib/apiError';

export default function GroupDetailScreen() {
  const { groupId: gidStr } = useLocalSearchParams<{ groupId: string }>();
  const groupId = parseInt(gidStr ?? '0', 10);
  const { colors } = useTheme();
  const router = useRouter();
  // Android edge-to-edge: KeyboardAvoidingView não sobe o compositor; padding pelo trecho coberto.
  const kb = useKeyboardOverlap();
  const { posts, appendPosts, prependPost, resetFeed, currentGroup, setCurrentGroup } = useGroupStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'events'>('feed');
  const [composerText, setComposerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // Load group + initial posts
  useEffect(() => {
    if (!groupId) return;
    resetFeed();
    setLoading(true);
    // Antes: Promise.all com os posts. Para quem não é membro os posts dão 403 e o grupo nem
    // aparecia. Agora o grupo carrega sozinho e os posts são opcionais.
    Promise.allSettled([
      getGroup(groupId).then(setCurrentGroup),
      getGroupPosts(groupId, 1).then(appendPosts),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Load events when switching to events tab
  useEffect(() => {
    if (activeTab === 'events' && !eventsLoaded) {
      getGroupEvents(groupId).then((evs) => { setEvents(evs); setEventsLoaded(true); });
    }
  }, [activeTab, eventsLoaded, groupId]);

  // SignalR: join group room, handle real-time posts
  useEffect(() => {
    if (!groupId) return;

    let cleanup = false;
    // getHubConnection() may return a Promise<HubConnection> or a HubConnection directly (depending on mock/impl)
    // We normalise via Promise.resolve so this works in both test and production environments
    const hubPromise = Promise.resolve(getHubConnection());

    hubPromise.then((hub) => {
      if (cleanup) return;

      const joinGroup = () => hub.invoke('JoinGroup', groupId).catch(console.error);
      joinGroup();

      hub.on('NewGroupPost', (post: GroupPost) => { if (!cleanup) prependPost(post); });

      // Pitfall 6: re-join after reconnect to prevent silent disconnection
      hub.onreconnected(() => { if (!cleanup) joinGroup(); });
    });

    return () => {
      cleanup = true;
      Promise.resolve(getHubConnection()).then((hub) => {
        hub.invoke('LeaveGroup', groupId).catch(console.error);
        hub.off('NewGroupPost');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const isMember = currentGroup?.myStatus === 'Active';
  const isPending = currentGroup?.myStatus === 'PendingApproval';
  const [joining, setJoining] = useState(false);

  // Não havia como entrar num grupo pelo app: quem não era membro só via a tela vazia.
  const handleJoin = async () => {
    if (!currentGroup) return;
    setJoining(true);
    setPostError(null);
    try {
      await joinGroup(groupId);
      const open = currentGroup.joinPolicy !== 'Closed';
      setCurrentGroup({
        ...currentGroup,
        myStatus: open ? 'Active' : 'PendingApproval',
        memberCount: currentGroup.memberCount + (open ? 1 : 0),
      });
      if (open) {
        resetFeed();
        getGroupPosts(groupId, 1).then(appendPosts).catch(() => {});
      }
    } catch (e) {
      setPostError(apiErrorMessage(e, 'Não foi possível entrar no grupo.'));
    } finally {
      setJoining(false);
    }
  };

  // Não havia como sair de um grupo. O dono não sai (o grupo ficaria sem responsável).
  const handleLeave = () => {
    if (!currentGroup) return;
    Alert.alert('Sair do grupo?', 'Você deixa de ver as publicações deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(groupId);
            setCurrentGroup({ ...currentGroup, myStatus: null, memberCount: Math.max(0, currentGroup.memberCount - 1) });
            resetFeed();
          } catch (e) {
            setPostError(apiErrorMessage(e, 'Não foi possível sair do grupo.'));
          }
        },
      },
    ]);
  };

  const handlePost = async () => {
    if (!composerText.trim()) return;
    setSubmitting(true);
    setPostError(null);
    try {
      // 'Geral' matches the backend's PostCategory enum (Dica/Alerta/Pergunta/Evento/Geral).
      // 'Outros' isn't a member — sending it made every group post fail with HTTP 400.
      await createGroupPost(groupId, { body: composerText, category: 'Geral' });
      setComposerText('');
      // SignalR will push new post via NewGroupPost — no manual prepend needed
    } catch (err) {
      setPostError('Não foi possível publicar. Tente novamente.');
      console.error('createGroupPost failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRsvp = async (ev: GroupEvent) => {
    const next = !ev.myRsvp;
    setEvents((evs) => evs.map((e) => e.id === ev.id ? { ...e, myRsvp: next, rsvpCount: e.rsvpCount + (next ? 1 : -1) } : e));
    await rsvpEvent(groupId, ev.id, next);
  };

  const renderPost = useCallback(({ item }: { item: GroupPost }) => (
    <View style={[styles.postCard, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.md }]}>
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <Text style={[styles.avatarText, { color: colors.mutedFg }]}>{item.author.displayName?.[0] ?? '?'}</Text>
        </View>
        <View>
          <Text style={[styles.authorName, { color: colors.fg }]}>{item.author.displayName}</Text>
          {item.author.isVerified && <VerifiedBadge verified compact />}
        </View>
      </View>
      <Text style={[styles.postBody, { color: colors.fg }]}>{item.body}</Text>
      <Text style={[styles.postMeta, { color: colors.mutedFg }]}>{item.likeCount} curtidas · {item.commentCount} comentários</Text>
    </View>
  ), [colors]);

  const renderEvent = useCallback(({ item }: { item: GroupEvent }) => (
    <View style={[styles.eventCard, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.md }]}>
      <Text style={[styles.eventTitle, { color: colors.fg }]}>{item.title}</Text>
      {item.location && <Text style={[styles.eventMeta, { color: colors.mutedFg }]}>{item.location}</Text>}
      <Text style={[styles.eventMeta, { color: colors.mutedFg }]}>{new Date(item.startsAt).toLocaleString('pt-BR')}</Text>
      <Text style={[styles.eventMeta, { color: colors.mutedFg }]}>{item.rsvpCount} confirmados</Text>
      <TouchableOpacity accessibilityRole="button"
        style={[
          styles.rsvpBtn,
          { borderColor: colors.border, borderRadius: radius.sm },
          item.myRsvp && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
        ]}
        onPress={() => handleRsvp(item)}
      >
        <Text style={[styles.rsvpText, { color: colors.mutedFg }, item.myRsvp && { color: colors.primary, fontFamily: fontFamily.semibold }]}>
          {item.myRsvp ? 'Confirmado' : 'Confirmar presença'}
        </Text>
      </TouchableOpacity>
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [events, colors]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View ref={kb.ref} onLayout={kb.onLayout} style={[styles.container, { backgroundColor: colors.bg, paddingBottom: Platform.OS === 'android' ? kb.overlap : 0 }]}>
        {currentGroup && (
          // Antes: só o nome, sem "voltar" e sem dizer do que é o grupo nem quantos participam.
          <View style={[styles.groupHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => goBackOr(router, '/groups')} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12} style={styles.back}>
                <Ionicons name="arrow-back" size={24} color={colors.fg} />
              </Pressable>
              <Text style={[styles.groupName, { color: colors.fg }]} numberOfLines={1} accessibilityRole="header">{currentGroup.name}</Text>
            </View>
            <View style={styles.metaRow}>
            <Text style={[styles.groupMeta, { color: colors.mutedFg, flex: 1 }]}>
              {currentGroup.category} · {currentGroup.memberCount} {currentGroup.memberCount === 1 ? 'membro' : 'membros'} · {currentGroup.joinPolicy === 'Closed' ? 'Entrada com aprovação' : 'Aberto'}
            </Text>
            {isMember && currentGroup.myRole !== 'Owner' ? (
              <Pressable onPress={handleLeave} accessibilityRole="button" hitSlop={10}>
                <Text style={[styles.leave, { color: colors.mutedFg }]}>Sair do grupo</Text>
              </Pressable>
            ) : null}
            </View>
            {currentGroup.description ? (
              <Text style={[styles.groupDesc, { color: colors.fg }]} numberOfLines={2}>{currentGroup.description}</Text>
            ) : null}
          </View>
        )}

        {/* Tab nav */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(['feed', 'events'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity accessibilityRole="button"
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, isActive && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
              >
                <Text style={[styles.tabText, { color: colors.mutedFg }, isActive && { color: colors.primary, fontFamily: fontFamily.semibold }]}>
                  {tab === 'feed' ? 'Feed' : 'Eventos'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'feed' ? (
          <>
            {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
              <FlatList
                data={posts}
                keyExtractor={(p) => String(p.id)}
                renderItem={renderPost}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                ListEmptyComponent={
                  isMember ? (
                    <EmptyState
                      icon="chatbubbles-outline"
                      title="Nenhuma publicação ainda"
                      subtitle="Seja o primeiro a compartilhar algo com o grupo."
                    />
                  ) : (
                    <EmptyState
                      icon="lock-closed-outline"
                      title="Só membros veem as publicações"
                      subtitle={isPending ? 'Seu pedido foi enviado. Você vê o grupo assim que for aprovado.' : 'Entre no grupo para ver e publicar.'}
                    />
                  )
                }
              />
            )}
            {postError && (
              <Text style={[styles.postErrorText, { color: colors.danger }]}>{postError}</Text>
            )}
            {!isMember && currentGroup ? (
              <View style={[styles.joinBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                {isPending ? (
                  <Text style={[styles.joinPending, { color: colors.mutedFg }]} accessibilityLiveRegion="polite">
                    Pedido enviado. Aguardando aprovação do responsável.
                  </Text>
                ) : (
                  <Button
                    title={currentGroup.joinPolicy === 'Closed' ? 'Solicitar entrada' : 'Entrar no grupo'}
                    icon="person-add-outline"
                    onPress={handleJoin}
                    loading={joining}
                  />
                )}
              </View>
            ) : (
            <View style={[styles.composer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.composerInput, { borderColor: colors.border, color: colors.fg, borderRadius: radius.sm }]}
                placeholder="Compartilhe algo..."
                placeholderTextColor={colors.mutedFg}
                value={composerText}
                onChangeText={setComposerText}
                multiline
              />
              <TouchableOpacity accessibilityRole="button"
                onPress={handlePost}
                disabled={submitting || !composerText.trim()}
                style={[styles.sendBtn, { backgroundColor: colors.primaryFill, borderRadius: radius.sm }]}
              >
                <Text style={styles.sendBtnText}>{submitting ? '...' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
            )}
          </>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(e) => String(e.id)}
            renderItem={renderEvent}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={
              <EmptyState
                icon="calendar-outline"
                title="Nenhum evento criado"
                subtitle="Organize um encontro ou atividade para o grupo."
              />
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: -6 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  groupName: { flex: 1, fontFamily: fontFamily.bold, fontSize: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leave: { fontFamily: fontFamily.semibold, fontSize: 13, textDecorationLine: 'underline' },
  groupMeta: { fontFamily: fontFamily.medium, fontSize: 13 },
  groupDesc: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontFamily: fontFamily.regular, fontSize: 14 },
  postCard: { padding: 14 },
  postHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  authorName: { fontFamily: fontFamily.semibold, fontSize: 14 },
  postBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  postMeta: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 8 },
  eventCard: { padding: 14, gap: 4 },
  eventTitle: { fontFamily: fontFamily.semibold, fontSize: 16 },
  eventMeta: { fontFamily: fontFamily.regular, fontSize: 13 },
  rsvpBtn: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, alignSelf: 'flex-start' },
  rsvpText: { fontFamily: fontFamily.regular, fontSize: 13 },
  joinBar: { padding: 12, borderTopWidth: 1 },
  joinPending: { fontFamily: fontFamily.medium, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  composer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, gap: 8, alignItems: 'flex-end' },
  composerInput: { flex: 1, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontFamily: fontFamily.regular, fontSize: 14, maxHeight: 100 },
  postErrorText: { fontFamily: fontFamily.regular, fontSize: 13, paddingHorizontal: 16, paddingTop: 8 },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 9 },
  sendBtnText: { color: '#fff', fontFamily: fontFamily.semibold, fontSize: 14 },
});
