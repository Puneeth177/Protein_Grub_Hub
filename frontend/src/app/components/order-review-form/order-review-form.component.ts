import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="review-form">
      <h3>Rate Your Experience</h3>
      
      <div class="rating-container">
        <div class="rating-stars">
          <span 
            *ngFor="let star of [1, 2, 3, 4, 5]" 
            (click)="setRating(star)"
            (mouseenter)="setHoverRating(star)"
            (mouseleave)="resetHoverRating()"
            class="star"
            [class.active]="star <= (hoverRating || rating)"
            [title]="getRatingText(star)"
          >
            {{ star <= (hoverRating || rating) ? '★' : '☆' }}
          </span>
        </div>
        <div class="rating-text" *ngIf="hoverRating > 0 || rating > 0">
          {{ getRatingText(hoverRating || rating) }}
        </div>
      </div>

      <div class="form-group">
        <label for="comment">Your Review (Optional)</label>
        <textarea
          id="comment"
          [(ngModel)]="comment"
          placeholder="Share your experience with this meal..."
          rows="4"
        ></textarea>
      </div>

      <div class="form-actions">
        <button 
          type="button" 
          class="btn btn-secondary" 
          (click)="skipReview()"
          [disabled]="submitting"
        >
          Skip
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          (click)="submitReview()"
          [disabled]="submitting || rating === 0"
        >
          <span *ngIf="!submitting">Submit Review</span>
          <span *ngIf="submitting" class="spinner"></span>
        </button>
      </div>

      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>
    </div>
  `,
  styles: [`
    .review-form {
      max-width: 500px;
      margin: 0 auto;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    
    h3 {
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    .rating-container {
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    .rating-stars {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .star {
      color: #e5e7eb;
      cursor: pointer;
      margin: 0 0.25rem;
      transition: color 0.2s;
    }
    
    .star:hover,
    .star.active {
      color: #f59e0b;
    }
    
    .rating-text {
      color: #6b7280;
      font-size: 0.875rem;
      min-height: 1.25rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #374151;
      font-weight: 500;
    }
    
    textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-family: inherit;
      font-size: 0.875rem;
      resize: vertical;
      min-height: 100px;
    }
    
    textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background-color: #2563eb;
    }
    
    .btn-secondary {
      background-color: #f3f4f6;
      color: #374151;
      border-color: #d1d5db;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background-color: #e5e7eb;
    }
    
    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 0.375rem;
      color: #b91c1c;
      font-size: 0.875rem;
    }
    
    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class OrderReviewFormComponent {
  @Input() orderId?: string;
  @Input() mealId?: string;
  @Input() mealName?: string;
  @Output() reviewSubmitted = new EventEmitter<any>();
  @Output() reviewSkipped = new EventEmitter<void>();
  
  rating = 0;
  comment = '';
  hoverRating = 0;
  submitting = false;
  error: string | null = null;

  setRating(value: number): void {
    this.rating = value;
  }

  setHoverRating(value: number): void {
    this.hoverRating = value;
  }

  resetHoverRating(): void {
    this.hoverRating = 0;
  }

  getRatingText(rating: number): string {
    const ratingTexts: { [key: number]: string } = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return ratingTexts[rating] || '';
  }

  // In the submitReview method, update the review object to include all necessary fields
async submitReview(): Promise<void> {
  if (this.submitting || !this.rating) return;

  // Ensure we have all required fields
  if (!this.mealId || !this.orderId) {
    console.error('Missing required fields:', {
      mealId: this.mealId,
      orderId: this.orderId
    });
    this.error = 'Missing required information. Please refresh and try again.';
    return;
  }

  this.submitting = true;
  this.error = null;

  try {
    const review = {
      orderId: this.orderId,
      mealId: this.mealId,
      mealName: this.mealName,
      rating: this.rating,
      comment: this.comment,
      date: new Date().toISOString()
    };

    console.log('Emitting review data:', review);
    this.reviewSubmitted.emit(review);
  } catch (error) {
    console.error('Error in submitReview:', error);
    this.error = 'Failed to submit review. Please try again.';
  } finally {
    this.submitting = false;
  }
}

  skipReview(): void {
    this.reviewSkipped.emit();
  }
}