export type GroupCategory = 'Esportes' | 'Animais' | 'Pais' | 'Seguranca' | 'Jardinagem' | 'Negocios' | 'Cultura' | 'Outros';
export type GroupJoinPolicy = 'Open' | 'Closed';
export type GroupScope = 'Bairro' | 'CrossBairro';
export type GroupMemberRole = 'Owner' | 'Admin' | 'Member';
export type GroupMemberStatus = 'Active' | 'PendingApproval' | 'Banned';

export interface Group {
  id: number;
  bairroId: number;
  name: string;
  description: string;
  category: GroupCategory;
  joinPolicy: GroupJoinPolicy;
  scope: GroupScope;
  rules: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  myStatus?: GroupMemberStatus | null;
  createdAt: string;
}

export interface GroupPost {
  id: number;
  groupId: number;
  authorId: string;
  author: { displayName: string | null; photoUrl: string | null; isVerified: boolean };
  category: string;
  body: string;
  isFlagged: boolean;
  likeCount: number;
  commentCount: number;
  images: { url: string; order: number }[];
  createdAt: string;
  editedAt: string | null;
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

export interface GroupPollOption {
  id: number;
  text: string;
  voteCount: number;
}

export interface GroupPoll {
  id: number;
  question: string;
  options: GroupPollOption[];
  totalVotes: number;
  userVoteOptionId: number | null;
  isClosed: boolean;
  createdAt: string;
  expiresAt: string | null;
  createdByUserId: string;
  createdByName: string | null;
}
