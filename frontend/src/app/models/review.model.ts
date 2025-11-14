export interface Review {
  _id?: string;
  id?: string; // For backward compatibility
  productId: string;
  rating: number;
  comment: string;
  author: {
    userId: string;
    name: string;
    avatarUrl?: string;
  };
  mealName?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  date?: string; // For backward compatibility
  isVerified?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ReviewResponse extends ApiResponse<Review> {}
export interface ReviewsResponse extends ApiResponse<Review[]> {}