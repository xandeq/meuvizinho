import { create } from 'zustand';
import type { PostDto, PostCategory, PostImageUpload } from './api/feed';
import { createFeedApi } from './api/feed';
import { apiClient } from './api';

const feedApi = createFeedApi(apiClient);

interface FeedState {
  posts: PostDto[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;

  loadFirstPage: (bairroId: number) => Promise<void>;
  loadNextPage: (bairroId: number) => Promise<void>;
  refresh: (bairroId: number) => Promise<void>;
  createPost: (category: PostCategory, body: string, images?: PostImageUpload[]) => Promise<void>;
  toggleLike: (postId: number) => Promise<void>;
  bumpComments: (postId: number) => void;
  reset: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  cursor: null,
  hasMore: true,
  loading: false,
  refreshing: false,

  loadFirstPage: async (bairroId) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const page = await feedApi.list(bairroId, null);
      set({ posts: page.items, cursor: page.nextCursor, hasMore: !!page.nextCursor });
    } finally {
      set({ loading: false });
    }
  },

  loadNextPage: async (bairroId) => {
    const { loading, hasMore, cursor } = get();
    if (loading || !hasMore) return;
    set({ loading: true });
    try {
      const page = await feedApi.list(bairroId, cursor);
      set((s) => ({
        posts: [...s.posts, ...page.items],
        cursor: page.nextCursor,
        hasMore: !!page.nextCursor,
      }));
    } finally {
      set({ loading: false });
    }
  },

  refresh: async (bairroId) => {
    set({ refreshing: true });
    try {
      const page = await feedApi.list(bairroId, null);
      set({ posts: page.items, cursor: page.nextCursor, hasMore: !!page.nextCursor });
    } finally {
      set({ refreshing: false });
    }
  },

  createPost: async (category, body, images = []) => {
    const post = await feedApi.create(category, body, images);
    set((s) => ({ posts: [post, ...s.posts] }));
  },

  toggleLike: async (postId) => {
    // Optimistic update
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      ),
    }));
    try {
      const result = await feedApi.toggleLike(postId);
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId ? { ...p, likedByMe: result.liked, likeCount: result.count } : p
        ),
      }));
    } catch {
      // Revert on failure
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1 }
            : p
        ),
      }));
    }
  },

  bumpComments: (postId) =>
    set((st) => ({ posts: st.posts.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)) })),
  reset: () => set({ posts: [], cursor: null, hasMore: true, loading: false, refreshing: false }),
}));
