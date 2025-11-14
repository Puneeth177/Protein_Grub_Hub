import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';
import { ReviewCardComponent } from '../review-card/review-card.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent, RouterModule],
  template: `
    <section class="testimonials-section">
      <div class="container">
        <div class="section-header">
          <h2>What Our Customers Say</h2>
          <p class="section-subtitle">Don't just take our word for it - hear from our satisfied customers</p>
        </div>
        
        <div *ngIf="reviews.length > 0; else noReviews" class="testimonials-grid">
          <app-review-card 
            *ngFor="let review of reviews" 
            [review]="review"
            [isCollapsed]="true">
          </app-review-card>
        </div>
        
        <ng-template #noReviews>
          <div class="no-reviews">
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        </ng-template>
        
        <div class="cta-buttons">
          <a routerLink="/meals" class="btn btn-primary">View Our Menu</a>
          <a routerLink="/auth/register" class="btn btn-outline">Join Our Community</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .testimonials-section {
      padding: 4rem 1rem;
      background-color: var(--color-background);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .section-header {
      text-align: center;
      margin-bottom: 3rem;
    }
    
    .section-header h2 {
      font-size: 2.25rem;
      color: var(--color-text);
      margin-bottom: 0.75rem;
      font-weight: 700;
    }
    
    .section-subtitle {
      color: var(--color-text-secondary);
      font-size: 1.125rem;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    
    .no-reviews {
      text-align: center;
      padding: 2rem;
      background: var(--color-surface);
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 3rem;
    }
    
    .cta-buttons {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-weight: 500;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
      text-decoration: none;
    }
    
    .btn-primary {
      background-color: #3b82f6;
      color: white;
      border: 1px solid transparent;
    }
    
    .btn-primary:hover {
      background-color: #2563eb;
    }
    
    .btn-outline {
      background-color: transparent;
      color: #3b82f6;
      border: 1px solid #3b82f6;
    }
    
    .btn-outline:hover {
      background-color: #eff6ff;
    }
    
    @media (max-width: 640px) {
      .testimonials-grid {
        grid-template-columns: 1fr;
      }
      
      .cta-buttons {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
      }
    }
  `]
})
export class TestimonialsComponent implements OnInit {
  reviews: Review[] = [];
  loading = true;
  
  constructor(private reviewService: ReviewService) {}
  
  ngOnInit(): void {
    this.loadReviews();
  }
  
  private loadReviews(): void {
    this.reviewService.getPublicReviews().subscribe({
      next: (reviews) => {
        this.reviews = reviews.slice(0, 6); // Show only 6 most recent reviews
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.loading = false;
      }
    });
  }
}
