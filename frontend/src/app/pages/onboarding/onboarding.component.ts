import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent {
  currentStep = 1;
  totalSteps = 3;

  // Step 1: Fitness Goals
  fitnessGoal = '';
  fitnessGoals = [
    { id: 'build-muscle', label: 'Build Muscle', icon: '💪' },
    { id: 'lose-weight', label: 'Lose Weight', icon: '⚖️' },
    { id: 'maintain-weight', label: 'Maintain Weight', icon: '🎯' },
    { id: 'improve-endurance', label: 'Improve Endurance', icon: '🏃' },
    { id: 'general-health', label: 'General Health', icon: '❤️' }
  ];

  // Step 2: Dietary Preferences
  dietaryPreferences: string[] = [];
  dietaryOptions = [
    { id: 'vegan', label: 'Vegan', icon: '🌱' },
    { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
    { id: 'keto', label: 'Keto', icon: '🥑' },
    { id: 'paleo', label: 'Paleo', icon: '🥩' },
    { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
    { id: 'dairy-free', label: 'Dairy-Free', icon: '🥛' }
  ];

  // Step 3: Health Information
  healthInfo = {
    age: '',
    weight: '',
    height: '',
    activityLevel: '',
    proteinGoal: 0,
    bmi: 0,
    bmiCategory: ''
  };

  activityLevels = [
    { id: 'sedentary', label: 'Sedentary (little/no exercise)', multiplier: 1.2 },
    { id: 'light', label: 'Lightly active (light exercise 1-3 days/week)', multiplier: 1.375 },
    { id: 'moderate', label: 'Moderately active (moderate exercise 3-5 days/week)', multiplier: 1.55 },
    { id: 'very', label: 'Very active (hard exercise 6-7 days/week)', multiplier: 1.725 },
    { id: 'extra', label: 'Extra active (very hard exercise, physical job)', multiplier: 1.9 }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      if (this.currentStep === 3) {
        this.calculateProteinGoal();
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectFitnessGoal(goal: string) {
    this.fitnessGoal = goal;
  }

  toggleDietaryPreference(preference: string) {
    const index = this.dietaryPreferences.indexOf(preference);
    if (index > -1) {
      this.dietaryPreferences.splice(index, 1);
    } else {
      this.dietaryPreferences.push(preference);
    }
  }

  calculateBMI() {
    if (this.healthInfo.weight && this.healthInfo.height) {
      const weight = parseFloat(this.healthInfo.weight);
      const heightInMeters = parseFloat(this.healthInfo.height) / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      this.healthInfo.bmi = Math.round(bmi * 10) / 10;

      // Determine BMI category
      if (bmi < 18.5) {
        this.healthInfo.bmiCategory = 'Underweight';
      } else if (bmi < 25) {
        this.healthInfo.bmiCategory = 'Normal weight';
      } else if (bmi < 30) {
        this.healthInfo.bmiCategory = 'Overweight';
      } else {
        this.healthInfo.bmiCategory = 'Obese';
      }
    }
  }

  calculateProteinGoal() {
    if (this.healthInfo.weight && this.healthInfo.activityLevel) {
      const weight = parseFloat(this.healthInfo.weight);
      const activityMultiplier = this.activityLevels.find(level => level.id === this.healthInfo.activityLevel)?.multiplier || 1.2;
      
      // Calculate BMI first
      this.calculateBMI();
      
      // Base protein calculation adjusted for BMI and goals
      let proteinPerKg = 1.2; // Base amount
      
      // Adjust base protein based on BMI category
      if (this.healthInfo.bmiCategory === 'Underweight') {
        proteinPerKg = 1.6; // Higher protein for underweight individuals
      } else if (this.healthInfo.bmiCategory === 'Overweight' || this.healthInfo.bmiCategory === 'Obese') {
        proteinPerKg = 1.4; // Moderate protein for weight management
      }
      
      // Further adjust based on fitness goals
      if (this.fitnessGoal === 'build-muscle') {
        proteinPerKg *= 1.5; // 1.8-2.2g per kg for muscle building
      } else if (this.fitnessGoal === 'lose-weight') {
        proteinPerKg *= 1.3; // Higher protein for preserving muscle during weight loss
      } else if (this.fitnessGoal === 'improve-endurance') {
        proteinPerKg *= 1.2; // Moderate increase for endurance training
      }
      
      // Adjust for activity level
      proteinPerKg *= (activityMultiplier / 1.375); // Normalize to moderate activity
      
      this.healthInfo.proteinGoal = Math.round(weight * proteinPerKg);
    }
  }

  completeOnboarding() {
    // Save onboarding data to localStorage
    const onboardingData = {
      fitnessGoal: this.fitnessGoal,
      dietaryPreferences: this.dietaryPreferences,
      healthInfo: this.healthInfo,
      completedAt: new Date().toISOString()
    };
    
    localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
    
    // Update user data through auth service
    this.authService.updateUser({
      onboardingCompleted: true,
      proteinGoal: this.healthInfo.proteinGoal,
      fitnessGoal: this.fitnessGoal,
      dietaryPreferences: this.dietaryPreferences,
      healthInfo: {
        age: this.healthInfo.age,
        weight: this.healthInfo.weight,
        height: this.healthInfo.height,
        activityLevel: this.healthInfo.activityLevel
      }
    }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Failed to update user profile:', error);
      }
    });
  }

  canProceedStep1(): boolean {
    return !!this.fitnessGoal;
  }

  canProceedStep2(): boolean {
    return this.dietaryPreferences.length > 0;
  }

  canProceedStep3(): boolean {
    return !!(this.healthInfo.age && this.healthInfo.weight && this.healthInfo.height && this.healthInfo.activityLevel);
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }
}