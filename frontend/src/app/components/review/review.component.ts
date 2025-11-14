// review.component.ts
import { Component, Input, OnInit, inject } from '@angular/core';
import { ReviewService } from '../../services/review.service';
import { AuthService, User } from '../../services/auth.service';
import { Review } from '../../models/review.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="review-section">
      <div *ngIf="isLoading" class="loading">Loading reviews...</div>
      <div *ngFor="let review of reviews" class="review">
        <div class="review-header">
          <div class="user-avatar">
            {{ (review.author.name.charAt(0) || 'U') }}
          </div>
          <div class="user-info">
            <h4>{{ review.author.name || 'Anonymous' }}</h4>
            <div class="rating">
              <span *ngFor="let star of [1,2,3,4,5]" 
                    [class.filled]="star <= review.rating">★</span>
            </div>
          </div>
        </div>
        <p class="comment">{{ review.comment }}</p>
      </div>
    </div>
  `,
  styles: [`
    .review-section {
      margin: 1rem 0;
    }
    .loading {
      padding: 1rem;
      text-align: center;
    }
    .review {
      margin-bottom: 1rem;
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    .review-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.75rem;
      font-weight: bold;
    }
    .rating {
      color: #ffc107;
      font-size: 1rem;
    }
    .rating .filled {
      color: #ffc107;
    }
    .comment {
      margin: 0.5rem 0 0;
      color: #333;
    }
  `]
})
export class ReviewComponent implements OnInit {
  @Input() mealId: string = '';
  reviews: Review[] = [];
  isLoading: boolean = false;

  private snackBar = inject(MatSnackBar);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    if (this.mealId) {
      this.loadReviews();
    }
  }

  loadReviews(): void {
    this.isLoading = true;
    this.reviewService.getReviewById(this.mealId).subscribe({
      next: (review: Review) => {
        this.reviews = [review];
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading reviews:', error);
        this.isLoading = false;
        this.snackBar.open('Failed to load reviews', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onReviewSubmit(rating: number, comment: string): void {
    if (!this.mealId) {
      console.error('Meal ID is required to submit a review');
      return;
    }

    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      this.snackBar.open('Please log in to submit a review', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const reviewData = {
      rating,
      comment,
      productId: this.mealId,
      author: {
        userId: currentUser._id,  // Changed from id to _id
        name: currentUser.name || 'Anonymous',
        avatarUrl: currentUser.avatar?.url
      }
    };

    this.isLoading = true;
    this.reviewService.addReview(reviewData).subscribe({
      next: (review: Review) => {
        this.reviews = [review, ...this.reviews];
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error submitting review:', error);
        this.isLoading = false;
        this.snackBar.open('Failed to submit review. Please try again.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}