// src/app/components/review-form/review-form.component.ts
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="review-form">
      <h3>Write a Review</h3>
      <div class="rating-input">
        <span *ngFor="let star of [1,2,3,4,5]" 
              (click)="rating = star" 
              [class.active]="star <= rating">
          ★
        </span>
      </div>
      <textarea [(ngModel)]="comment" 
                placeholder="Share your experience..."></textarea>
      <button (click)="submitReview()" 
              [disabled]="!comment || rating === 0">
        Submit Review
      </button>
    </div>
  `,
  styles: [`
    .review-form {
      max-width: 500px;
      margin: 2rem auto;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .rating-input {
      font-size: 2rem;
      color: #ddd;
      margin: 1rem 0;
      cursor: pointer;
    }
    .rating-input span {
      margin-right: 0.5rem;
    }
    .rating-input .active {
      color: #f1c40f;
    }
    textarea {
      width: 100%;
      min-height: 100px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
    }
    button {
      background: #3498db;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }
  `]
})
export class ReviewFormComponent {
  @Input() rating: number = 0;
  @Input() comment: string = '';
  
  @Output() reviewSubmit = new EventEmitter<{ rating: number; comment: string }>();
  
  submitReview(): void {
    if (this.rating > 0) {
      this.reviewSubmit.emit({ 
        rating: this.rating, 
        comment: this.comment 
      });
      // Reset form
      this.rating = 0;
      this.comment = '';
    }
  }
}