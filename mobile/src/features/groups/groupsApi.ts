import { apiClient } from '@/lib/api';

export interface Group {
  id: number;
  bairroId: number;
  name: string;
  description: string;
  category: string;
  joinPolicy: 'Open' | 'Closed';
  scope: 'Bairro' | 'CrossBairro';
  memberCount: number;
  myStatus?: string | null;
  myRole?: string | null;
  coverImageUrl?: string | null;
}

export interface GroupPost {
  id: number;
  groupId: number;
  authorId: string;
  author: { displayName: string | null; photoUrl: string | null; isVerified: boolean };
  category: string;
  body: string;
  likeCount: number;
  commentCount: number;
  images: { url: string; order: number }[];
  createdAt: string;
}

export interface GroupEvent {
  id: number;
  groupId: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  rsvpCount: number;
  myRsvp: boolean | null;
}

export async function getGroups(bairroId: number, params?: { search?: string; page?: number }): Promise<Group[]> {
  const { data } = await apiClient.get<Group[]>('/api/v1/groups', { params: { bairroId, ...params } });
  return data;
}

export async function getGroup(id: number): Promise<Group> {
  const { data } = await apiClient.get<Group>(`/api/v1/groups/${id}`);
  return data;
}

export async function createGroup(body: Partial<Group> & { bairroId: number; name: string; description: string }): Promise<Group> {
  const { data } = await apiClient.post<Group>('/api/v1/groups', body);
  return data;
}

export async function joinGroup(groupId: number): Promise<void> {
  await apiClient.post(`/api/v1/groups/${groupId}/members`);
}

export async function leaveGroup(groupId: number): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${groupId}/members/me`);
}

export async function getGroupPosts(groupId: number, page = 1): Promise<GroupPost[]> {
  const { data } = await apiClient.get<GroupPost[]>(`/api/v1/groups/${groupId}/posts`, { params: { page } });
  return data;
}

export async function createGroupPost(groupId: number, body: { body: string; category: string }): Promise<GroupPost> {
  const { data } = await apiClient.post<GroupPost>(`/api/v1/groups/${groupId}/posts`, body);
  return data;
}

export async function toggleGroupPostLike(groupId: number, postId: number): Promise<void> {
  await apiClient.post(`/api/v1/groups/${groupId}/posts/${postId}/likes`);
}

export async function getGroupEvents(groupId: number): Promise<GroupEvent[]> {
  const { data } = await apiClient.get<GroupEvent[]>(`/api/v1/groups/${groupId}/events`);
  return data;
}

export async function createGroupEvent(groupId: number, body: { title: string; startsAt: string; location?: string; reminderAt?: string }): Promise<GroupEvent> {
  const { data } = await apiClient.post<GroupEvent>(`/api/v1/groups/${groupId}/events`, body);
  return data;
}

export async function rsvpEvent(groupId: number, eventId: number, isAttending: boolean): Promise<void> {
  await apiClient.post(`/api/v1/groups/${groupId}/events/${eventId}/rsvp`, { isAttending });
}
