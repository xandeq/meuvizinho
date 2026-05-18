import api from '@/lib/api';
import type { Group, GroupPost, GroupEvent } from '@/lib/types/groups';

export async function getGroups(bairroId: number, params?: { search?: string; category?: string; page?: number }): Promise<Group[]> {
  const { data } = await api.get<Group[]>('/api/v1/groups', { params: { bairroId, ...params } });
  return data;
}

export async function createGroup(body: Partial<Group> & { bairroId: number; name: string; description: string }): Promise<Group> {
  const { data } = await api.post<Group>('/api/v1/groups', body);
  return data;
}

export async function getGroup(id: number): Promise<Group> {
  const { data } = await api.get<Group>(`/api/v1/groups/${id}`);
  return data;
}

export async function joinGroup(groupId: number): Promise<void> {
  await api.post(`/api/v1/groups/${groupId}/members`);
}

export async function leaveGroup(groupId: number): Promise<void> {
  await api.delete(`/api/v1/groups/${groupId}/members/me`);
}

export async function getGroupPosts(groupId: number, page = 1): Promise<GroupPost[]> {
  const { data } = await api.get<GroupPost[]>(`/api/v1/groups/${groupId}/posts`, { params: { page } });
  return data;
}

export async function createGroupPost(groupId: number, body: { body: string; category: string; images?: string[] }): Promise<GroupPost> {
  const { data } = await api.post<GroupPost>(`/api/v1/groups/${groupId}/posts`, body);
  return data;
}

export async function toggleGroupPostLike(groupId: number, postId: number): Promise<void> {
  await api.post(`/api/v1/groups/${groupId}/posts/${postId}/likes`);
}

export async function deleteGroupPost(groupId: number, postId: number): Promise<void> {
  await api.delete(`/api/v1/groups/${groupId}/posts/${postId}`);
}

export async function getGroupEvents(groupId: number): Promise<GroupEvent[]> {
  const { data } = await api.get<GroupEvent[]>(`/api/v1/groups/${groupId}/events`);
  return data;
}

export async function createGroupEvent(groupId: number, body: Partial<GroupEvent> & { title: string; startsAt: string }): Promise<GroupEvent> {
  const { data } = await api.post<GroupEvent>(`/api/v1/groups/${groupId}/events`, body);
  return data;
}

export async function rsvpEvent(groupId: number, eventId: number, isAttending: boolean): Promise<void> {
  await api.post(`/api/v1/groups/${groupId}/events/${eventId}/rsvp`, { isAttending });
}

export interface GroupMember {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export async function getGroupMembers(groupId: number, page = 0, pageSize = 20) {
  const res = await api.get<{ items: GroupMember[]; total: number }>(
    `/api/v1/groups/${groupId}/members`,
    { params: { page, pageSize } }
  );
  return res.data;
}
