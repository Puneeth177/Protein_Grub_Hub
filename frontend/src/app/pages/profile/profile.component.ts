// Add Inject and PLATFORM_ID
import { Component, OnInit, Inject } from '@angular/core';
// Keep CommonModule and add isPlatformBrowser
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { AvatarPickerComponent, AvatarPickerResult } from '../../components/avatar-picker/avatar-picker.component';
import { PLATFORM_ID } from '@angular/core';
import { getInitials } from '../../utils/image';



@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AvatarPickerComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  isEditing = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  showAvatarEditor = false;

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  initials(name: string): string {
    return getInitials(name);
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserData();
      this.loadOnboardingData();
    }
  }

  loadUserData() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileForm.name = user.name;
        this.profileForm.email = user.email;
        this.profileForm.proteinGoal = user.proteinGoal || 0;
      }
    });
  }

  loadOnboardingData() {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Skip when running on the server
    }
    const onboardingDataStr = localStorage.getItem('onboardingData');
    if (onboardingDataStr) {
      this.onboardingData = JSON.parse(onboardingDataStr);
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.clearMessages();
    if (!this.isEditing) {
      this.loadUserData(); // Reset form data
    }
  }

  saveProfile() {
    if (!this.validateForm()) {
      return;
    }

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
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to update profile';
      }
    });
  }

  // Avatar handlers
  openAvatarEditor() {
    this.showAvatarEditor = true;
  }

  closeAvatarEditor() {
    this.showAvatarEditor = false;
  }

  onAvatarSelected(result: AvatarPickerResult) {
    if (!this.currentUser) return;

    if (!result.url) {
      // Avatar removed → clear avatar on the user
      this.currentUser = { ...this.currentUser, avatar: undefined } as User;
    } else {
      // Avatar set/uploaded → update url/id
      this.currentUser = {
        ...this.currentUser,
        avatar: { url: result.url, id: result.id }
      } as User;
    }

    // Persist to AuthService so navbar and other surfaces update too
    this.authService.setCurrentUser(this.currentUser as User);

    this.showAvatarEditor = false;
    this.successMessage = 'Avatar updated';
    setTimeout(() => { this.successMessage = ''; }, 3000);
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