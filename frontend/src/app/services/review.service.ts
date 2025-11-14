// src/app/services/review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';
import { Review, ReviewResponse, ReviewsResponse } from '../models/review.model';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/reviews`;
  private reviews$ = new BehaviorSubject<Review[]>([]);

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    // Load initial reviews
    this.loadReviews();
  }

  // Normalize raw backend review document into our frontend Review model
  private normalizeReview(raw: any): Review {
    if (!raw) {
      return {
        productId: '',
        rating: 0,
        comment: '',
        author: { userId: '', name: 'User' }
      };
    }

    const author = raw.author || {};

    return {
      _id: raw._id,
      id: raw._id,
      productId: raw.productId ?? '',
      rating: raw.rating ?? 0,
      comment: raw.comment ?? raw.text ?? '',
      author: {
        userId: (author.userId || raw.userId || '').toString(),
        name: author.name || 'User',
        avatarUrl: author.avatarUrl
      },
      mealName: raw.mealName,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      date: raw.date ?? raw.createdAt
    };
  }

  public get reviews(): Observable<Review[]> {
    return this.reviews$.asObservable();
  }

  // Load all reviews from the API
  private loadReviews(): void {
    this.http.get<any>(this.apiUrl)
      .pipe(
        // Backend returns { reviews, total, averageRating, ratingCounts }
        map(response => (response && (response.reviews ?? response.data ?? [])) as any[]),
        map(rawReviews => (rawReviews || []).map(r => this.normalizeReview(r)))
      )
      .subscribe({
        next: (reviews) => {
          this.reviews$.next(reviews);
        },
        error: (error) => {
          console.error('Error loading reviews:', error);
          this.reviews$.next([]);
        }
      });
  }

  /**
   * Get all verified reviews from other users
   * @returns Observable of Review[] containing only verified reviews from other users
   */

  /**
   * Get reviews for the current user
   * @returns Observable of Review[] containing only the current user's reviews
   */
  getCurrentUserReviews(): Observable<Review[]> {
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap((user: User | null) => {
        if (!user?._id) {
          console.log('No user ID found - user not logged in');
          return of([]);
        }

        const userId = user._id;

        // Ensure we have a fresh copy of all reviews in the BehaviorSubject
        const current = this.reviews$.getValue();
        if (!current || current.length === 0) {
          this.loadReviews();
        }

        return this.reviews$.pipe(
          take(1),
          map((reviews) =>
            (reviews || []).filter(r => r.author?.userId === userId)
          ),
          catchError(err => {
            console.error('Error filtering current user reviews:', err);
            return of([]);
          })
        );
      }),
      catchError(err => {
        console.error('Unexpected error in getCurrentUserReviews:', err);
        return of([]);
      })
    );
  }

  /**
   * Add a new review
   * @param reviewData Review data without system-generated fields
   * @returns Observable of the created review
   */
  // In review.service.ts

getMealReviews(mealId: string): Observable<Review[]> {
  return this.http.get<Review[]>(`${this.apiUrl}/meal/${mealId}`);
}

getPublicReviews(): Observable<Review[]> {
  return this.http.get<Review[]>(`${this.apiUrl}/public`);
}

  /**
   * Get reviews for a specific meal
   * @param mealId ID of the meal to get reviews for
   * @returns Observable of Review[] for the specified meal
   */

  /**
   * Get a specific review by ID
   * @param reviewId ID of the review to retrieve
   * @returns Observable of the requested review or undefined if not found
   */
  getReviewById(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  /**
   * Update an existing review
   * @param reviewId ID of the review to update
   * @param updates Object containing the fields to update
   * @returns Observable of the updated review
   */
  updateReview(reviewId: string, updates: Partial<Review>): Observable<Review> {
    return this.http.put<{ success: boolean; data: Review }>(
      `${this.apiUrl}/${reviewId}`,
      updates
    ).pipe(
      map(response => response.data),
      tap(updatedReview => {
        // Update the local reviews list
        const currentReviews = this.reviews$.getValue();
        const index = currentReviews.findIndex(r => r.id === reviewId);
        if (index !== -1) {
          currentReviews[index] = updatedReview;
          this.reviews$.next([...currentReviews]);
        }
      })
    );
  }

  /**
   * Delete a review
   * @param reviewId ID of the review to delete
   * @returns Observable of boolean indicating success
   */
  deleteReview(reviewId: string): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${reviewId}`).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          // Remove the review from the local list
          const currentReviews = this.reviews$.getValue();
          this.reviews$.next(
            currentReviews.filter(r => r.id !== reviewId && r._id !== reviewId)
          );
        }
      })
    );
  }

  // Get reviews by user ID
  getUserReviews(userId: string): Observable<Review[]> {
    return this.http.get<ReviewsResponse>(`${this.apiUrl}/user/${userId}`).pipe(
      map(response => response?.data || []),
      catchError((error: any) => {
        console.error('Error fetching user reviews:', error);
        return of([]);
      })
    );
  }

  // Add a new review
  addReview(review: Partial<Review>): Observable<Review> {
    // Backend expects { productId, rating, text }
    const payload: any = {
      productId: review.productId,
      rating: review.rating,
      text: review.comment ?? ''
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      // Backend returns the created review document directly
      map(raw => this.normalizeReview(raw)),
      tap(created => {
        // Push the normalized review into the local list for any subscribers
        const currentReviews = this.reviews$.getValue();
        const safeCurrent = Array.isArray(currentReviews) ? currentReviews : [];
        this.reviews$.next([...safeCurrent, created]);
      }),
      catchError((error: any) => {
        console.error('Error adding review:', error);
        return throwError(() => error);
      })
    );
  }

  // Get current user's review for a specific meal
  getUserMealReview(mealId: string): Observable<Review | null> {
    return this.authService.currentUser$.pipe(
      switchMap(currentUser => {
        if (!currentUser?._id) return of(null);
        
        return this.getMealReviews(mealId).pipe(
          map(reviews => {
            return reviews.find(r => r.author.userId === currentUser._id) || null;
          })
        );
      })
    );
  }

  // Get average rating for a meal
  getAverageRating(mealId: string): Observable<number> {
    return this.getMealReviews(mealId).pipe(
      map(mealReviews => {
        if (mealReviews.length === 0) return 0;
        const sum = mealReviews.reduce((acc, curr) => acc + curr.rating, 0);
        return +(sum / mealReviews.length).toFixed(1);
      })
    );
  }
}