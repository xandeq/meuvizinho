import type { AxiosInstance } from 'axios';

export interface PostAuthor {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
}

export interface PostImage {
  url: string;
  order: number;
}

export type PostCategory = 0 | 1 | 2 | 3 | 4;

export interface PostDto {
  id: number;
  author: PostAuthor;
  bairroId: number;
  category: PostCategory;
  body: string;
  images: PostImage[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isEdited: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface FeedPageDto {
  items: PostDto[];
  nextCursor: string | null;
}

export interface CommentDto {
  id: number;
  postId: number;
  parentCommentId: number | null;
  author: PostAuthor;
  body: string;
  createdAt: string;
  editedAt: string | null;
  replies: CommentDto[];
}

export interface LikeToggleResult {
  liked: boolean;
  count: number;
}

export function createFeedApi(client: AxiosInstance) {
  return {
    list: async (bairroId: number, cursor?: string | null, take = 20): Promise<FeedPageDto> => {
      const params: Record<string, unknown> = { bairroId, take };
      if (cursor) params.cursor = cursor;
      const res = await client.get<FeedPageDto>('/api/v1/posts', { params });
      return res.data;
    },

    create: async (category: PostCategory, body: string): Promise<PostDto> => {
      const fd = new FormData();
      fd.append('category', String(category));
      fd.append('body', body);
      const res = await client.post<PostDto>('/api/v1/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },

    getPost: async (postId: number): Promise<PostDto> => {
      const res = await client.get<{ post: PostDto } | PostDto>(`/api/v1/posts/${postId}`);
      return 'post' in res.data ? res.data.post : res.data;
    },

    getComments: async (postId: number): Promise<CommentDto[]> => {
      const res = await client.get<CommentDto[]>(`/api/v1/comments/by-post/${postId}`);
      return res.data;
    },

    createComment: async (postId: number, body: string, parentCommentId: number | null = null): Promise<CommentDto> => {
      const res = await client.post<CommentDto>('/api/v1/comments', { postId, parentCommentId, body });
      return res.data;
    },

    toggleLike: async (postId: number): Promise<LikeToggleResult> => {
      const res = await client.post<LikeToggleResult>(`/api/v1/posts/${postId}/like`);
      return res.data;
    },
  };
}
