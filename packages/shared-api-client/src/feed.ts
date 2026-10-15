import type { AxiosInstance } from 'axios';
import type {
  PostDto,
  FeedPageDto,
  CommentDto,
  CreateCommentRequest,
  CreateReportRequest,
  ReportDto,
  NotificationDto,
  SearchRequest,
  LikeToggleResult,
} from '@bairronow/shared-types';

export interface ListFeedParams {
  bairroId: number;
  cursor?: string | null;
  take?: number;
}

export interface ResolveReportParams {
  action: 'dismiss' | 'remove';
  reason?: string;
}

export function createFeedClient(client: AxiosInstance) {
  return {
    listFeed: async (params: ListFeedParams): Promise<FeedPageDto> => {
      const { data } = await client.get<FeedPageDto>('/api/v1/posts', {
        params: {
          bairroId: params.bairroId,
          cursor: params.cursor ?? undefined,
          take: params.take ?? 20,
        },
      });
      return data;
    },

    getPost: async (
      id: number
    ): Promise<PostDto & { comments: CommentDto[] }> => {
      // A API responde { post, comments }; a página de detalhe tratava a resposta como o
      // próprio post e quebrava ("Algo deu errado") ao ler post.author.id.
      const { data } = await client.get<
        { post: PostDto; comments: CommentDto[] } | (PostDto & { comments: CommentDto[] })
      >(`/api/v1/posts/${id}`);
      if ('post' in data && data.post) return { ...data.post, comments: data.comments ?? [] };
      return data as PostDto & { comments: CommentDto[] };
    },

    createPost: async (form: FormData): Promise<PostDto> => {
      const { data } = await client.post<PostDto>('/api/v1/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },

    updatePost: async (id: number, body: string): Promise<PostDto> => {
      const { data } = await client.put<PostDto>(`/api/v1/posts/${id}`, {
        body,
      });
      return data;
    },

    deletePost: async (id: number): Promise<void> => {
      await client.delete(`/api/v1/posts/${id}`);
    },

    toggleLike: async (postId: number): Promise<LikeToggleResult> => {
      const { data } = await client.post<LikeToggleResult>(
        `/api/v1/posts/${postId}/like`,
        {}
      );
      return data;
    },

    listWhoLiked: async (postId: number) => {
      const { data } = await client.get(`/api/v1/posts/${postId}/like/who`);
      return data;
    },

    listComments: async (postId: number): Promise<CommentDto[]> => {
      const { data } = await client.get<CommentDto[]>(
        `/api/v1/comments/by-post/${postId}`
      );
      return data;
    },

    createComment: async (req: CreateCommentRequest): Promise<CommentDto> => {
      const { data } = await client.post<CommentDto>('/api/v1/comments', req);
      return data;
    },

    updateComment: async (id: number, body: string): Promise<CommentDto> => {
      const { data } = await client.put<CommentDto>(`/api/v1/comments/${id}`, {
        body,
      });
      return data;
    },

    deleteComment: async (id: number): Promise<void> => {
      await client.delete(`/api/v1/comments/${id}`);
    },

    search: async (
      req: SearchRequest
    ): Promise<{ items: PostDto[]; total: number }> => {
      const { data } = await client.get<{ items: PostDto[]; total: number }>(
        '/api/v1/search',
        { params: req }
      );
      return data;
    },

    createReport: async (req: CreateReportRequest): Promise<ReportDto> => {
      const { data } = await client.post<ReportDto>('/api/v1/reports', req);
      return data;
    },

    listPendingReports: async (
      skip = 0,
      take = 50
    ): Promise<ReportDto[]> => {
      const { data } = await client.get<ReportDto[]>(
        '/api/v1/admin/moderation/reports',
        { params: { skip, take } }
      );
      return data;
    },

    resolveReport: async (
      id: number,
      action: 'dismiss' | 'remove',
      reason?: string
    ): Promise<void> => {
      await client.post(`/api/v1/admin/moderation/reports/${id}/resolve`, {
        action,
        reason,
      });
    },

    listNotifications: async (): Promise<NotificationDto[]> => {
      const { data } = await client.get<NotificationDto[]>(
        '/api/v1/notifications'
      );
      return data;
    },

    markRead: async (id: number): Promise<void> => {
      await client.post(`/api/v1/notifications/${id}/read`, {});
    },

    markAllRead: async (): Promise<void> => {
      await client.post('/api/v1/notifications/read-all', {});
    },
  };
}

export type FeedClient = ReturnType<typeof createFeedClient>;
