// Feed module shared types — generated for Phase 03-01.
// Mirrors BairroNow.Api.Models.DTOs.* and Enums.

export type PostCategory = "Dica" | "Alerta" | "Pergunta" | "Evento" | "Geral";
export type ReportReason =
  | "Spam"
  | "Offensive"
  | "Discrimination"
  | "Misinformation"
  | "Other";
export type ReportTargetType = "post" | "comment" | "listing";
export type NotificationType =
  | "comment"
  | "reply"
  | "like"
  | "mention"
  | "GroupJoinApproved"
  | "NewRating"
  | "GroupEvent"
  | "listing_expired"
  | "price_drop";

export interface PostImageDto {
  url: string;
  order: number;
}

export interface PostAuthorDto {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  // Wave E:
  isBusinessAccount?: boolean;
  businessName?: string | null;
  businessCategory?: string | null;
}

export interface PostDto {
  id: number;
  author: PostAuthorDto;
  bairroId: number;
  category: PostCategory;
  body: string;
  images: PostImageDto[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isEdited: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface CreatePostRequest {
  category: PostCategory;
  body: string;
}

export interface FeedPageDto {
  items: PostDto[];
  nextCursor: string | null;
}

export interface CommentDto {
  id: number;
  postId: number;
  parentCommentId: number | null;
  author: PostAuthorDto;
  body: string;
  createdAt: string;
  editedAt: string | null;
  replies: CommentDto[];
}

export interface CreateCommentRequest {
  postId: number;
  parentCommentId: number | null;
  body: string;
}

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  note: string | null;
}

export interface ReportDto {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  note: string | null;
  reporterEmail: string;
  createdAt: string;
  status: "pending" | "resolved" | "dismissed";
}

export interface NotificationDto {
  id: number;
  type: NotificationType;
  postId: number | null;
  commentId: number | null;
  groupId: number | null;
  actor: PostAuthorDto;
  isRead: boolean;
  createdAt: string;
}

export interface SearchRequest {
  q: string;
  category?: PostCategory;
  from?: string;
  to?: string;
  authorId?: string;
  skip?: number;
  take?: number;
}

export interface LikeToggleResult {
  liked: boolean;
  count: number;
}

// ----------------------------------------------------------------------------
// Legacy stub types — kept for compatibility with pre-Phase-03 placeholder
// pages (marketplace, profile stub, old FeedList/PostCard). These will be
// removed once those screens are rewritten against the real DTOs above.
// ----------------------------------------------------------------------------

export interface Author {
  id: string;
  name: string;
  bairro: string;
  verified: boolean;
}

export interface Post {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  seller: Author;
}
