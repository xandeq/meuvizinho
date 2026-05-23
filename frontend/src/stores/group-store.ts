import { create } from 'zustand';
import type { Group, GroupPost } from '@/lib/types/groups';

interface GroupStoreState {
  groups: Group[];
  currentGroup: Group | null;
  posts: GroupPost[];
  hasMore: boolean;
  page: number;
  setGroups: (groups: Group[]) => void;
  setCurrentGroup: (group: Group | null) => void;
  appendPosts: (posts: GroupPost[]) => void;
  prependPost: (post: GroupPost) => void;
  removePost: (postId: number) => void;
  updatePost: (postId: number, patch: Partial<GroupPost>) => void;
  resetFeed: () => void;
  incrementPage: () => void;
}

export const useGroupStore = create<GroupStoreState>((set) => ({
  groups: [],
  currentGroup: null,
  posts: [],
  hasMore: true,
  page: 1,
  setGroups: (groups) => set({ groups }),
  setCurrentGroup: (group) => set({ currentGroup: group }),
  appendPosts: (newPosts) => set((s) => ({
    posts: [...s.posts, ...newPosts],
    hasMore: newPosts.length === 20,
  })),
  prependPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),
  removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
  updatePost: (id, patch) => set((s) => ({ posts: s.posts.map((p) => p.id === id ? { ...p, ...patch } : p) })),
  resetFeed: () => set({ posts: [], hasMore: true, page: 1 }),
  incrementPage: () => set((s) => ({ page: s.page + 1 })),
}));
