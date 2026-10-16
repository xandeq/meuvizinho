jest.mock('../signalr', () => ({ getHubConnection: jest.fn() }));
jest.mock('../api/chat', () => ({
  chatApi: {
    markRead: jest.fn().mockResolvedValue(undefined),
    getUnreadCount: jest.fn().mockResolvedValue({ total: 2 }),
  },
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }), { virtual: true });

import { useChatStore } from '../chat-store';
import { useAuthStore } from '../auth-store';
import { chatApi } from '../api/chat';

describe('selo de não lidas', () => {
  it('atualiza o total depois de marcar a conversa como lida', async () => {
    useChatStore.setState({ unreadTotal: 5 });
    await useChatStore.getState().markRead(1);
    expect(chatApi.getUnreadCount).toHaveBeenCalled();
    expect(useChatStore.getState().unreadTotal).toBe(2);
  });

  it('ao sair, libera o registro do hub para o próximo login', () => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true });
    useChatStore.setState({ hubRegistered: true, unreadTotal: 3 });
    useAuthStore.getState().logout();
    expect(useChatStore.getState().hubRegistered).toBe(false);
    expect(useChatStore.getState().unreadTotal).toBe(0);
  });
});
