import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review } from '../../models/review.model';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="review-card">
      <div class="review-header">
        <div class="user-avatar">{{ (review.author.name.charAt(0) || 'U') }}</div>
        <div class="user-info">
          <h4 class="user-name">{{ review.author.name || 'Anonymous' }}
            <span *ngIf="review.isVerified" class="verified-badge">✓</span>
          </h4>
          <div class="rating" [title]="review.rating + ' out of 5 stars'">
            <span *ngFor="let star of [1,2,3,4,5]" [class.filled]="star <= review.rating">★</span>
          </div>
        </div>
      </div>
      <p class="review-comment" [class.collapsed]="isCollapsed && !showFull">
        {{ review.comment || '' }}
      </p>
      <button *ngIf="review.comment && review.comment.length > 150" 
              class="read-more" 
              (click)="toggleReadMore()">
        {{ showFull ? 'Read less' : 'Read more' }}
      </button>
      <div class="review-footer">
        <span class="review-date">{{ formatDate(review.createdAt || review.date) }}</span>
        <span *ngIf="showActions" class="review-actions">
          <button type="button" class="btn-icon" title="Edit" (click)="onEdit.emit()">✏️</button>
          <button 
            type="button" 
            class="btn-icon" 
            title="Delete" 
            (click)="deleteReview()"
            [disabled]="!review.id">
            🗑️
          </button>
        </span>
      </div>
    </div>
  `,
  styles: [`
    .review-card {
      background: var(--color-surface);
      border-radius: var(--border-radius);
      padding: 1.5rem;
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
      margin-bottom: 1rem;
    }
    
    .review-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .review-header {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 1rem;
    }
    
    .user-info {
      flex: 1;
    }
    
    .user-name {
      margin: 0;
      font-size: 1rem;
      color: var(--color-text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .verified-badge {
      color: var(--color-primary);
      font-size: 0.8rem;
    }
    
    .rating {
      color: var(--color-warning);
      font-size: 1rem;
      letter-spacing: 2px;
    }
    
    .rating .filled {
      color: var(--color-warning);
    }
    
    .review-comment {
      color: var(--color-text);
      line-height: 1.6;
      margin: 1rem 0;
    }
    
    .review-comment.collapsed {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .read-more {
      background: none;
      border: none;
      color: var(--color-primary);
      cursor: pointer;
      padding: 0;
      font-size: 0.9rem;
      margin: 0.5rem 0;
    }
    
    .review-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }
    
    .review-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-secondary);
      font-size: 1rem;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .btn-icon:hover {
      background: var(--color-background);
      color: var(--color-primary);
    }
    
    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a90e2, #8e44ad);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: bold;
      margin-right: 1rem;
    }
    
    .user-info {
      flex: 1;
    }
    
    .user-name {
      margin: 0 0 0.25rem 0;
      color: #2c3e50;
      font-size: 1rem;
    }
    
    .rating {
      color: #f1c40f;
      font-size: 1rem;
      letter-spacing: 2px;
    }
    
    .rating .filled {
      color: #f1c40f;
    }
    
    .review-comment {
      color: #34495e;
      line-height: 1.6;
      margin: 0 0 1rem 0;
      white-space: pre-line;
    }
    
    .review-comment.collapsed {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .read-more {
      background: none;
      border: none;
      color: #3498db;
      cursor: pointer;
      padding: 0.25rem 0;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    
    .review-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }
    
    .review-date {
      font-size: 0.8rem;
      color: #7f8c8d;
    }
    
    .review-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    
    .btn-icon:hover {
      opacity: 1;
    }
    
    .verified-badge {
      color: #2ecc71;
      font-size: 0.9em;
      margin-left: 0.25rem;
    }
  `]
})
export class ReviewCardComponent {
  @Input() review!: Review;
  @Input() showActions = false;
  @Output() onEdit = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<string>();
  @Input() isCollapsed = true;
  
  showFull = false;
  
  formatDate(dateString?: string | Date): string {
    if (!dateString) return '';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  toggleReadMore(): void {
    this.showFull = !this.showFull;
  }

  deleteReview(): void {
    if (this.review.id) {
      this.onDelete.emit(this.review.id);
    }
  }
}
