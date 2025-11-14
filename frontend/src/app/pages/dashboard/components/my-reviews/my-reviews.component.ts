import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../../../services/review.service';
import { Review } from '../../../../models/review.model';
import { ReviewCardComponent } from '../../../../components/review-card/review-card.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent, RouterModule],
  template: `
    <div class="my-reviews">
      <div class="section-header">
        <h2>My Reviews</h2>
        <p>Manage and edit your reviews here</p>
      </div>
      
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading your reviews...</p>
      </div>
      
      <div *ngIf="!loading && reviews.length === 0" class="no-reviews">
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#9CA3AF"/>
          </svg>
          <h3>No Reviews Yet</h3>
          <p>You haven't reviewed any meals yet. Order now and share your experience!</p>
          <a routerLink="/meals" class="btn btn-primary">Browse Meals</a>
        </div>
      </div>
      
      <div *ngIf="!loading && reviews.length > 0" class="reviews-list">
        <div class="reviews-header">
          <p>You've left {{reviews.length}} review{{reviews.length > 1 ? 's' : ''}}</p>
        </div>
        
        <div class="reviews-grid">
          <app-review-card 
            *ngFor="let review of reviews" 
            [review]="review"
            [showActions]="true"
            (onEdit)="onEditReview(review)"
            (onDelete)="onDeleteReview(review.id)">
          </app-review-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-reviews {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .section-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .section-header h2 {
      font-size: 1.5rem;
      color: #111827;
      margin: 0 0 0.5rem 0;
      font-weight: 600;
    }
    
    .section-header p {
      color: #6b7280;
      margin: 0;
    }
    
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      color: #6b7280;
    }
    
    .spinner {
      width: 2.5rem;
      height: 2.5rem;
      border: 0.25rem solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .no-reviews {
      padding: 3rem 1rem;
      text-align: center;
    }
    
    .empty-state {
      max-width: 28rem;
      margin: 0 auto;
    }
    
    .empty-icon {
      width: 4rem;
      height: 4rem;
      margin-bottom: 1rem;
    }
    
    .empty-state h3 {
      font-size: 1.25rem;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }
    
    .empty-state p {
      color: #6b7280;
      margin: 0 0 1.5rem 0;
    }
    
    .reviews-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .reviews-header p {
      color: #6b7280;
      margin: 0;
      font-size: 0.875rem;
    }
    
    .reviews-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background-color: #3b82f6;
      color: white;
      border: 1px solid transparent;
    }
    
    .btn-primary:hover {
      background-color: #2563eb;
    }
    
    @media (min-width: 768px) {
      .my-reviews {
        padding: 2rem;
      }
      
      .reviews-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (min-width: 1024px) {
      .reviews-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `]
})
export class MyReviewsComponent implements OnInit {
  reviews: Review[] = [];
  loading = true;
  
  constructor(private reviewService: ReviewService) {}
  
  ngOnInit(): void {
    this.loadMyReviews();
  }
  
  private loadMyReviews(): void {
    this.reviewService.getCurrentUserReviews().subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading your reviews:', error);
        this.loading = false;
      }
    });
  }
  
  onEditReview(review: Review): void {
    // Implement edit functionality
    console.log('Edit review:', review);
  }
  
  onDeleteReview(reviewId: string | undefined): void {
    if (!reviewId) return;
    
    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: () => {
          this.reviews = this.reviews.filter(r => r.id !== reviewId);
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          alert('Failed to delete review. Please try again.');
        }
      });
    }
  }
}
