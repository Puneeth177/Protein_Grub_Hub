import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { AvatarPickerComponent, AvatarPickerResult } from '../../components/avatar-picker/avatar-picker.component';
import { PLATFORM_ID } from '@angular/core';
import { getInitials } from '../../utils/image';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    ReactiveFormsModule,
    AvatarPickerComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isEditing = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showAvatarEditor = false;
  
  // Review related properties
  userReviews: Review[] = [];
  loadingReviews = false;
  reviewError: string | null = null;
  showReviewForm = false;
  reviewForm: FormGroup;
  selectedMealId: string | null = null;
  isDarkMode = false;
  // Show more / show less for reviews
  showAllReviews = false;
  readonly defaultVisibleReviews = 3;

  // Form data
  profileForm = {
    name: '',
    email: '',
    proteinGoal: 0,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // Onboarding data
  onboardingData: any = null;

  constructor(
    public authService: AuthService,
    private reviewService: ReviewService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  initials(name: string): string {
    return getInitials(name);
  }

  private subscription: any;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserData();
      this.loadOnboardingData();
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadUserReviews(): void {
    if (!this.currentUser) return;

    this.loadingReviews = true;
    this.reviewError = null;

    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.subscription = this.reviewService.getCurrentUserReviews().subscribe({
      next: (reviews) => {
        this.userReviews = reviews || [];
        this.loadingReviews = false;
      },
      error: (err) => {
        console.error('Error loading user reviews:', err);
        this.reviewError = 'Failed to load your reviews. Please try again later.';
        this.loadingReviews = false;
      }
    });
  }

  get visibleUserReviews(): Review[] {
    return this.showAllReviews
      ? this.userReviews
      : this.userReviews.slice(0, this.defaultVisibleReviews);
  }

  get canToggleUserReviews(): boolean {
    return this.userReviews.length > this.defaultVisibleReviews;
  }

  toggleShowAllReviews(): void {
    this.showAllReviews = !this.showAllReviews;
  }

  onReviewSubmit(): void {
    if (!this.currentUser || !this.selectedMealId) {
      this.snackBar.open('Please select a meal to review', 'Close', { duration: 3000 });
      return;
    }

    if (this.reviewForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    const reviewData = {
      rating: this.reviewForm.get('rating')?.value,
      comment: this.reviewForm.get('comment')?.value,
      productId: this.selectedMealId,
      author: {
        userId: this.currentUser._id || this.currentUser._id || '',
        name: this.currentUser.name || 'Anonymous',
        avatarUrl: this.currentUser.avatar?.url
      }
    };

    this.isLoading = true;
    this.reviewError = null;

    this.reviewService.addReview(reviewData).subscribe({
      next: (newReview) => {
        this.userReviews = [newReview, ...this.userReviews];
        this.showReviewForm = false;
        this.reviewForm.reset();
        this.isLoading = false;
        this.successMessage = 'Thank you for your review!';
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        this.reviewError = 'Failed to submit your review. Please try again.';
        this.isLoading = false;
        this.snackBar.open('Failed to submit review', 'Close', { duration: 3000 });
      }
    });
  }

  onDeleteReview(reviewId: string | undefined): void {
    if (!reviewId) return;

    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: () => {
          // Remove from local list as well (support both _id and id)
          this.userReviews = this.userReviews.filter(r => r._id !== reviewId && r.id !== reviewId);
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.snackBar.open('Failed to delete review', 'Close', { duration: 3000 });
        }
      });
    }
  }

  formatDate(dateString: string | Date): string {
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

  toggleReviewForm(mealId?: string): void {
    this.selectedMealId = mealId || null;
    this.showReviewForm = !this.showReviewForm;
    if (this.showReviewForm) {
      this.reviewForm.reset();
    }
    this.reviewError = null;
  }

  loadUserData() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileForm.name = user.name;
        this.profileForm.email = user.email;
        this.profileForm.proteinGoal = user.proteinGoal || 0;
        this.loadUserReviews();
      }
    });
  }

  loadOnboardingData() {
    if (!isPlatformBrowser(this.platformId)) return;
    const onboardingDataStr = localStorage.getItem('onboardingData');
    if (onboardingDataStr) {
      this.onboardingData = JSON.parse(onboardingDataStr);
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.clearMessages();
    if (!this.isEditing) {
      this.loadUserData();
    }
  }

  saveProfile() {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.clearMessages();

    this.authService.updateUser({
      name: this.profileForm.name,
      proteinGoal: this.profileForm.proteinGoal
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.isEditing = false;
        this.successMessage = 'Profile updated successfully!';
        this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to update profile';
        this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  openAvatarEditor() {
    this.showAvatarEditor = true;
  }

  closeAvatarEditor() {
    this.showAvatarEditor = false;
  }

  onAvatarSelected(result: AvatarPickerResult) {
    if (!this.currentUser) return;

    if (!result.url) {
      this.currentUser = { ...this.currentUser, avatar: undefined } as User;
    } else {
      this.currentUser = {
        ...this.currentUser,
        avatar: { url: result.url, id: result.id }
      } as User;
    }

    this.authService.setCurrentUser(this.currentUser);
    this.showAvatarEditor = false;
    this.snackBar.open('Avatar updated', 'Close', { duration: 3000 });
  }

  validateForm(): boolean {
    if (!this.profileForm.name.trim()) {
      this.errorMessage = 'Name is required';
      return false;
    }

    if (this.profileForm.proteinGoal < 0 || this.profileForm.proteinGoal > 500) {
      this.errorMessage = 'Protein goal must be between 0 and 500 grams';
      return false;
    }

    if (this.profileForm.newPassword && this.profileForm.newPassword !== this.profileForm.confirmPassword) {
      this.errorMessage = 'New passwords do not match';
      return false;
    }

    return true;
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  getDietaryPreferencesText(): string {
    if (!this.onboardingData?.dietaryPreferences) return 'Not specified';
    return this.onboardingData.dietaryPreferences.join(', ');
  }

  getFitnessGoalText(): string {
    if (!this.onboardingData?.fitnessGoal) return 'Not specified';
    return this.onboardingData.fitnessGoal.replace('-', ' ').toUpperCase();
  }

  getActivityLevelText(): string {
    if (!this.onboardingData?.healthInfo?.activityLevel) return 'Not specified';
    const activity = this.onboardingData.healthInfo.activityLevel;
    const activityLabels: { [key: string]: string } = {
      'sedentary': 'Sedentary (little/no exercise)',
      'light': 'Lightly active (light exercise 1-3 days/week)',
      'moderate': 'Moderately active (moderate exercise 3-5 days/week)',
      'active': 'Very active (hard exercise 6-7 days/week)',
      'very': 'Very active (hard exercise 6-7 days/week)',
      'extra': 'Extra active (very hard exercise, physical job)'
    };
    return activityLabels[activity] || activity;
  }
}