import { apiClient } from '../api';

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  sentAt: string;
}

export interface ConversationDto {
  id: number;
  listingId: number;
  listingTitle: string;
  listingThumbnailUrl: string | null;
  otherUserId: string;
  otherUserDisplayName: string | null;
  otherUserIsVerified: boolean;
  lastMessageAt: string;
  unreadCount: number;
  lastMessagePreview?: string | null;
  lastMessageIsMine?: boolean;
}

export interface UnreadCountResponse {
  total: number;
}

export const chatApi = {
  listConversations: async (): Promise<ConversationDto[]> => {
    const { data } = await apiClient.get<ConversationDto[]>('/api/v1/chat/conversations');
    return data;
  },

  createConversation: async (listingId: number): Promise<ConversationDto> => {
    const { data } = await apiClient.post<ConversationDto>('/api/v1/chat/conversations', {
      listingId,
    });
    return data;
  },

  getHistory: async (
    conversationId: number,
    before?: string,
    limit = 50
  ): Promise<MessageDto[]> => {
    const { data } = await apiClient.get<MessageDto[]>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { params: { before, limit } }
    );
    return data;
  },

  sendMessage: async (
    conversationId: number,
    text: string,
    image?: { uri: string; name: string; type: string }
  ): Promise<MessageDto> => {
    const form = new FormData();
    if (text) form.append('text', text);
    if (image) {
      form.append('image', {
        uri: image.uri,
        name: image.name || 'chat-image.jpg',
        type: image.type || 'image/jpeg',
      } as unknown as Blob);
    }
    const { data } = await apiClient.post<MessageDto>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  markRead: async (conversationId: number): Promise<void> => {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/read`, {});
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const { data } = await apiClient.get<UnreadCountResponse>('/api/v1/chat/unread-count');
    return data;
  },
};
