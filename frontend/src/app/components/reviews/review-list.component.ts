import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewsService } from '../../services/reviews.service';
import { Review, ReactionType, ReviewListResponse } from '../../models/review.interface';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-list.component.html',
  styleUrls: ['./review-list.component.css'],
  host: { 'ngSkipHydration': 'true' }
})

export class ReviewListComponent implements OnInit {
  @Input() productId: string | null = 'home_testimonials';
    // add inside the class
    round(n: number): number { return Math.round(n); }
    ceil(n: number): number { return Math.ceil(n); }
  // listing
  reviews: Review[] = [];
  total = 0;
  averageRating = 0;
  ratingCounts: { [k: number]: number } = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  limit = 5;
  skip = 0;
  sort: 'latest' | 'top' | 'rating' = 'latest';
  loading = false;
  error = '';

  // form
  formRating = 0;
  formText = '';
  submitting = false;
  formError = '';
  successMsg = '';

    // Show-more / Show-less state (2 rows x 2 cols = 4 by default)
    showAll = false;
    readonly cols = 2;            // matches .cards-grid (2 columns)
    readonly collapsedRows = 2;   // show 2 rows by default

    get collapsedCount(): number {
        return this.cols * this.collapsedRows;
    }

    get visibleCount(): number {
        return this.showAll ? this.reviews.length : Math.min(this.collapsedCount, this.reviews.length);
    }

    toggleShowAll() {
        this.showAll = !this.showAll;
    }

  // track in-flight reaction requests to prevent spamming
  reacting: { [id: string]: boolean } = {};

  constructor(
    private reviewsService: ReviewsService,
    private authService: AuthService
    ) {}

    currentUserId: string | null = null;

    ngOnInit() {
        // SSR-safe: we already skip hydration, but this is fine
        const user = this.authService.getCurrentUser?.() || this.authService['currentUserSubject']?.value;
        this.currentUserId = user?._id || user?.id || null;

        this.fetch();
    }

    isOwner(r: Review): boolean {
        if (!this.currentUserId) return false;
        return String(r.author.userId) === String(this.currentUserId);
    }

    // Basic initials helper if no avatar
    getInitials(name: string): string {
        if (!name) return '';
        const parts = name.trim().split(/\s+/);
        const first = parts[0]?.[0] || '';
        const last = parts[1]?.[0] || '';
        return (first + last).toUpperCase();
    }

    deleting: { [id: string]: boolean } = {};

    deleteReview(r: Review) {
        if (!this.isOwner(r) || this.deleting[r._id]) return;
        const ok = confirm('Delete your review?');
        if (!ok) return;

        this.deleting[r._id] = true;
        // Optimistic: remove from list immediately, then reconcile on error
        const idx = this.reviews.findIndex(x => x._id === r._id);
        const prev = [...this.reviews];
        if (idx >= 0) {
            this.reviews.splice(idx, 1);
            this.total = Math.max(0, this.total - 1);
        }

        this.reviewsService.remove(r._id).subscribe({
            next: () => {
            this.deleting[r._id] = false;
            // recompute aggregates by refetching the current page
            this.fetch();
            },
            error: () => {
            // rollback
            this.reviews = prev;
            this.deleting[r._id] = false;
            }
        });
    }

    // Character count helper
    remainingChars(): number {
        return Math.max(0, 1000 - (this.formText?.length || 0));
    }

  fetch() {
    this.loading = true;
    this.error = '';
    this.reviewsService.list({ productId: this.productId || undefined, limit: this.limit, skip: this.skip, sort: this.sort })
      .subscribe({
        next: (res: ReviewListResponse) => {
          this.reviews = res.reviews;
          this.total = res.total;
          this.averageRating = res.averageRating;
          this.ratingCounts = res.ratingCounts;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to load reviews';
          this.loading = false;
        }
      });
  }

  changeSort(newSort: 'latest' | 'top' | 'rating') {
    if (this.sort === newSort) return;
    this.sort = newSort;
    this.skip = 0;
    this.fetch();
  }

  nextPage() {
    if (this.skip + this.limit >= this.total) return;
    this.skip += this.limit;
    this.fetch();
  }

  prevPage() {
    if (this.skip === 0) return;
    this.skip -= this.limit;
    this.fetch();
  }

  // form submit
  submitReview() {
    this.formError = '';
    if (!Number.isInteger(this.formRating) || this.formRating < 1 || this.formRating > 5) {
      this.formError = 'Please select a rating (1–5)';
      return;
    }
    if (this.formText && this.formText.length > 1000) {
      this.formError = 'Review text must be ≤ 1000 characters';
      return;
    }

    this.submitting = true;
    this.reviewsService.create({ productId: this.productId || undefined, rating: this.formRating, text: this.formText })
      .subscribe({
        next: (created) => {
          // optimistic insert to top based on sort=latest (if other sort, just refetch)
          if (this.sort === 'latest') {
            this.reviews = [created, ...this.reviews].slice(0, this.limit);
            this.total += 1;
          } else {
            this.fetch();
          }
          this.formRating = 0;
          this.formText = '';
          this.successMsg = 'Thank you for your review!';
          setTimeout(() => this.successMsg = '', 2000);
          this.submitting = false;
        },
        error: (err) => {
          this.formError = err?.error?.message || err?.message || 'Failed to submit review';
          this.submitting = false;
        }
      });
  }

  // reaction toggle (optimistic)
  react(review: Review, type: ReactionType) {
    if (this.reacting[review._id]) return;
    this.reacting[review._id] = true;

    // optimistic: toggle locally
    let userReaction: ReactionType | null = this.getUserReaction(review);
    const prev = { likes: review.likes, dislikes: review.dislikes, userReaction };

    if (userReaction === type) {
      // remove reaction
      if (type === 'like') review.likes = Math.max(0, review.likes - 1);
      else review.dislikes = Math.max(0, review.dislikes - 1);
      userReaction = null;
    } else {
      // switch/add reaction
      if (userReaction === 'like') review.likes = Math.max(0, review.likes - 1);
      if (userReaction === 'dislike') review.dislikes = Math.max(0, review.dislikes - 1);
      if (type === 'like') review.likes += 1;
      if (type === 'dislike') review.dislikes += 1;
      userReaction = type;
    }
    (review as any).__userReaction = userReaction;

    this.reviewsService.react(review._id, type).subscribe({
      next: (res) => {
        review.likes = res.likes;
        review.dislikes = res.dislikes;
        (review as any).__userReaction = res.userReaction;
        this.reacting[review._id] = false;
      },
      error: () => {
        // rollback
        review.likes = prev.likes;
        review.dislikes = prev.dislikes;
        (review as any).__userReaction = prev.userReaction;
        this.reacting[review._id] = false;
      }
    });
  }

  getUserReaction(review: Review): ReactionType | null {
    return (review as any).__userReaction || null;
  }

  // helpers for stars
  stars(n: number): number[] { return Array.from({ length: n }).map((_, i) => i); }
  emptyStars(n: number): number[] { return Array.from({ length: 5 - n }).map((_, i) => i); }
}