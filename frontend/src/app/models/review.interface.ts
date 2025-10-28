export type ReactionType = 'like' | 'dislike';

export interface ReviewAuthor {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface Review {
  _id: string;
  productId?: string | null;
  author: ReviewAuthor;
  rating: number;
  text?: string;
  likes: number;
  dislikes: number;
  reactions?: Array<{ userId: string; type: ReactionType; createdAt: string }>;
  status: 'published' | 'hidden' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  averageRating: number;
  ratingCounts: { [k: number]: number };
}