jest.mock('../signalr', () => ({ getHubConnection: jest.fn() }));
jest.mock('../api', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

import { notificationText, notificationRoute, type NotificationItem } from '../notifications-store';

const base: NotificationItem = {
  id: 1,
  type: 'like',
  postId: null,
  commentId: null,
  groupId: null,
  actor: { id: 'a', displayName: 'Carlos', photoUrl: null, isVerified: true },
  isRead: false,
  createdAt: new Date().toISOString(),
};

describe('notificações', () => {
  it('usa o texto pronto da API quando existe', () => {
    expect(notificationText({ ...base, type: 'resv_reviewed', body: 'Sua reserva de Salão foi aprovada' }))
      .toBe('Sua reserva de Salão foi aprovada');
  });

  it('tipos de condomínio não caem no texto genérico', () => {
    for (const type of ['res_request', 'res_reviewed', 'resv_pending', 'resv_reviewed', 'annc_new', 'security_alert']) {
      expect(notificationText({ ...base, type })).not.toMatch(/interagiu/);
    }
  });

  it('leva cada tipo para a tela certa', () => {
    expect(notificationRoute({ ...base, type: 'resv_reviewed', postId: 3 })).toBe('/condominios/3/reservas');
    expect(notificationRoute({ ...base, type: 'annc_new', postId: 9, groupId: 3 })).toBe('/condominios/3/comunicado/9');
    expect(notificationRoute({ ...base, type: 'security_alert', postId: 5 })).toBe('/(tabs)/alertas');
    expect(notificationRoute({ ...base, type: 'comment', postId: 7 })).toBe('/post/7');
  });
});

describe('notificationTone', () => {
  // Antes todo ícone de notificação era azul — até o coração da curtida.
  it('dá cor ao tipo, igual ao site', () => {
    const { notificationTone } = require('../notifications-store');
    expect(notificationTone('like')).toBe('danger');
    expect(notificationTone('security_alert')).toBe('danger');
    expect(notificationTone('annc_new')).toBe('accent');
    expect(notificationTone('resv_reviewed')).toBe('secondary');
    expect(notificationTone('comment')).toBe('primary');
    expect(notificationTone('qualquer-coisa')).toBe('primary');
  });
});
