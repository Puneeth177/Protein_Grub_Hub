// src/app/components/review-list/review-list.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="testimonials-container">
      <div class="section-header">
        <h2>What Our Customers Say</h2>
        <p class="section-subtitle">Hear from our satisfied customers</p>
      </div>
      
      <div *ngIf="loading" class="loading-spinner">
        <div class="spinner"></div>
      </div>

      <div *ngIf="!loading && filteredReviews.length === 0" class="no-reviews">
        <p>No customer reviews yet.</p>
      </div>

      <div class="testimonials-grid">
        <div *ngFor="let review of visibleReviews" class="testimonial-card">
          <div class="testimonial-header">
            <div class="user-avatar">{{ (review.author.name.charAt(0) || 'U') }}</div>
            <div class="user-info">
              <div class="user-header-row">
                <h4 class="user-name">{{ review.author.name || 'Anonymous' }}
                  <span *ngIf="review.isVerified" class="verified-badge" title="Verified Buyer">✓</span>
                </h4>
                <div class="rating" [title]="review.rating + ' out of 5 stars'">
                  <span *ngFor="let star of [1,2,3,4,5]" [class.filled]="star <= review.rating">★</span>
                </div>
              </div>
              <div class="review-date">{{ formatDate(review.createdAt || review.date) }}</div>
            </div>
          </div>
          <p class="testimonial-comment">"{{ review.comment }}"</p>
          <div *ngIf="review.mealName" class="reviewed-item">
            <span>Meal: </span>
            <strong>{{ review.mealName }}</strong>
          </div>
        </div>
      </div>

      <div class="more-controls" *ngIf="canToggle">
        <button class="btn btn-sm" type="button" (click)="toggleShowAll()">
          {{ showAll ? 'Show less' : 'Show more' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .testimonials-container {
      padding: 4rem 1rem;
      max-width: 1200px;
      margin: 0 auto;
      background-color: var(--color-background);
    }

    .section-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .section-header h2 {
      font-size: 2rem;
      color: var(--color-primary);
      margin-bottom: 0.75rem;
      font-weight: 700;
    }

    .section-subtitle {
      color: var(--color-text-secondary);
      font-size: 1.1rem;
      max-width: 600px;
      margin: 0 auto 2rem;
      line-height: 1.6;
    }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .testimonial-card {
      background: var(--color-surface);
      border-radius: var(--border-radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      transition: all 0.3s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--color-border);
    }

    .testimonial-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .testimonial-header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--gradient-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      font-size: 1.1rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
    }

    .user-header-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.5rem;
    }

    .user-name {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      color: var(--color-text);
      display: flex;
      align-items: center;
      font-weight: 600;
    }

    .rating {
      color: var(--color-warning);
      font-size: 0.9rem;
      letter-spacing: 1px;
      margin: 0;
    }

    .rating .filled {
      color: var(--color-warning);
    }

    .testimonial-comment {
      color: var(--color-text);
      line-height: 1.7;
      margin: 1rem 0;
      font-style: italic;
      flex-grow: 1;
    }

    .reviewed-item {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      font-size: 0.9rem;
      color: #636e72;
    }

    .review-date {
      font-size: 0.85rem;
      color: #95a5a6;
      margin-top: 0.25rem;
    }

    .verified-badge {
      color: #2ecc71;
      font-size: 1.1em;
      margin-left: 0.5rem;
    }

    .no-reviews {
      text-align: center;
      color: #636e72;
      padding: 3rem 1rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      margin: 2rem 0;
    }

    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .cta-section {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #3498db;
      color: white;
      border: 2px solid #3498db;
    }

    .btn-primary:hover {
      background: #2980b9;
      border-color: #2980b9;
    }

    .btn-outline {
      background: transparent;
      color: #3498db;
      border: 2px solid #3498db;
    }

    .btn-outline:hover {
      background: rgba(52, 152, 219, 0.1);
    }
  `]
})
export class ReviewListComponent implements OnInit {
  @Input() productId?: string;
  @Input() showAddReviewButton = true; 
  @Input() reviews: Review[] = [];
  filteredReviews: Review[] = [];
  loading = true;
  error: string | null = null;
  currentUserId: string | null = null;
  // show more / show less state
  showAll = false;
  readonly defaultVisible = 3;
  
  constructor(
    private reviewService: ReviewService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?._id || null;
      this.filterReviews();
    });
  }
  
  ngOnInit(): void {
    this.loadReviews();
  }
  
  loadReviews(): void {
    this.loading = true;
    this.error = null;

    // Use the unified ReviewService stream, which is populated
    // from GET /api/reviews in review.service.ts
    this.reviewService.reviews.subscribe({
      next: (reviews) => {
        this.reviews = reviews || [];
        this.filterReviews();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading reviews:', err);
        this.error = 'Failed to load reviews. Please try again later.';
        this.loading = false;
      }
    });
  }

  get visibleReviews(): Review[] {
    return this.showAll
      ? this.filteredReviews
      : this.filteredReviews.slice(0, this.defaultVisible);
  }

  get canToggle(): boolean {
    return this.filteredReviews.length > this.defaultVisible;
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
  }
  
  private filterReviews(): void {
    // Home 'What Our Customers Say': show reviews from OTHER users only.
    if (!this.reviews || this.reviews.length === 0) {
      this.filteredReviews = [];
      return;
    }

    if (!this.currentUserId) {
      // Not logged in -> show all reviews
      this.filteredReviews = [...this.reviews];
      return;
    }

    this.filteredReviews = this.reviews.filter(review =>
      review.author?.userId !== this.currentUserId
    );
  }
  
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
}