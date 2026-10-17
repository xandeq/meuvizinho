import { useEffect } from 'react';
import { create } from 'zustand';
import type { Href } from 'expo-router';
import { apiClient } from './api';
import type { PostAuthor } from './api/feed';
import { getHubConnection } from './signalr';

export interface NotificationItem {
  id: number;
  type: string;
  postId: number | null;
  commentId: number | null;
  groupId: number | null;
  actor: PostAuthor;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
}

// Central de notificações do app. Antes só existia no site: no celular, aviso de reserva
// aprovada, comunicado ou alerta só chegava por push (e se o push falhasse, nunca).
interface NotificationsState {
  items: NotificationItem[];
  loaded: boolean;
  loading: boolean;
  error: boolean;
  load: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  receive: (n: NotificationItem) => void;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  loaded: false,
  loading: false,
  error: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: false });
    try {
      const { data } = await apiClient.get<NotificationItem[]>('/api/v1/notifications');
      set({ items: data, loaded: true });
    } catch {
      set({ error: true });
    } finally {
      set({ loading: false });
    }
  },
  markRead: async (id) => {
    set({ items: get().items.map((n) => (n.id === id ? { ...n, isRead: true } : n)) });
    try {
      await apiClient.post(`/api/v1/notifications/${id}/read`);
    } catch {
      // Melhor esforço: a próxima carga corrige.
    }
  },
  markAllRead: async () => {
    set({ items: get().items.map((n) => ({ ...n, isRead: true })) });
    try {
      await apiClient.post('/api/v1/notifications/read-all');
    } catch {
      // Melhor esforço.
    }
  },
  receive: (n) => {
    if (get().items.some((x) => x.id === n.id)) return;
    set({ items: [n, ...get().items] });
  },
  reset: () => set({ items: [], loaded: false, error: false }),
}));

export const selectUnread = (s: NotificationsState) => s.items.filter((n) => !n.isRead).length;

export function notificationText(n: NotificationItem): string {
  if (n.body) return n.body;
  const who = n.actor?.displayName ?? 'Alguém';
  switch (n.type) {
    case 'like': return `${who} curtiu seu post`;
    case 'comment': return `${who} comentou no seu post`;
    case 'reply': return `${who} respondeu seu comentário`;
    case 'mention': return `${who} mencionou você`;
    case 'GroupJoinApproved': return 'Sua entrada no grupo foi aprovada';
    case 'NewRating': return `${who} avaliou seu negócio`;
    case 'GroupEvent': return `${who} criou um evento no grupo`;
    case 'listing_expired': return 'Seu anúncio expirou';
    case 'price_drop': return 'Queda de preço em um anúncio favorito';
    case 'security_alert': return `${who} reportou uma ocorrência no bairro`;
    case 'res_request': return `${who} pediu vínculo com o condomínio`;
    case 'res_reviewed': return 'Seu vínculo com o condomínio foi revisado';
    case 'resv_pending': return `${who} pediu uma reserva de área comum`;
    case 'resv_reviewed': return 'Sua reserva de área comum foi revisada';
    case 'annc_new': return 'Novo comunicado do condomínio';
    default: return `${who} interagiu com você`;
  }
}

export function notificationIcon(type: string): string {
  switch (type) {
    case 'like': return 'heart';
    case 'comment':
    case 'reply':
    case 'mention': return 'chatbubble-ellipses';
    case 'security_alert': return 'warning';
    case 'annc_new': return 'megaphone';
    case 'resv_pending':
    case 'resv_reviewed': return 'calendar';
    case 'res_request':
    case 'res_reviewed': return 'business';
    case 'listing_expired':
    case 'price_drop': return 'pricetag';
    case 'GroupJoinApproved':
    case 'GroupEvent': return 'people';
    case 'NewRating': return 'star';
    default: return 'notifications';
  }
}

// Cor do tipo (mesma lógica do site): antes todo ícone era azul — até o coração da curtida.
export type NotificationTone = 'primary' | 'secondary' | 'accent' | 'danger';
export function notificationTone(type: string): NotificationTone {
  switch (type) {
    case 'like':
    case 'security_alert': return 'danger';
    case 'annc_new':
    case 'listing_expired':
    case 'price_drop':
    case 'NewRating': return 'accent';
    case 'resv_pending':
    case 'resv_reviewed':
    case 'res_request':
    case 'res_reviewed': return 'secondary';
    default: return 'primary';
  }
}

// Destino no app. Tipos de condomínio: postId = id do condomínio (annc_new: postId = comunicado,
// groupId = condomínio). Gestão do síndico fica no site, então os pedidos abrem o condomínio.
export function notificationRoute(n: NotificationItem): Href | null {
  switch (n.type) {
    case 'listing_expired':
    case 'price_drop':
      return n.postId ? `/marketplace/${n.postId}` : '/(tabs)/marketplace';
    case 'GroupJoinApproved':
    case 'GroupEvent':
      return n.groupId ? `/groups/${n.groupId}` : '/groups';
    case 'NewRating':
      return '/profile';
    case 'security_alert':
      return '/(tabs)/alertas';
    case 'res_request':
    case 'res_reviewed':
    case 'resv_pending':
      return n.postId ? `/condominios/${n.postId}` : '/(tabs)/condominio';
    case 'resv_reviewed':
      return n.postId ? `/condominios/${n.postId}/reservas` : '/(tabs)/condominio';
    case 'annc_new':
      return n.groupId && n.postId ? `/condominios/${n.groupId}/comunicado/${n.postId}` : '/(tabs)/condominio';
    default:
      return n.postId ? `/post/${n.postId}` : null;
  }
}

// Mantém a contagem do sino em dia: carrega uma vez e escuta o evento "notification" do hub.
export function useNotificationsLive(enabled: boolean) {
  const load = useNotificationsStore((s) => s.load);
  const receive = useNotificationsStore((s) => s.receive);
  useEffect(() => {
    if (!enabled) return;
    load();
    let off: (() => void) | undefined;
    let cancelled = false;
    getHubConnection()
      .then((conn) => {
        if (cancelled) return;
        const handler = (n: NotificationItem) => receive(n);
        conn.on('notification', handler);
        off = () => conn.off('notification', handler);
      })
      .catch(() => {
        // Sem tempo real: o sino ainda atualiza ao abrir a tela.
      });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [enabled, load, receive]);
}
