import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Meal } from '../../models/meal.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: any = {};
  proteinGoal = 150;
  currentProtein = 0;
  quickProteinAmount = '';
  recommendedMeals: Meal[] = [];
  weeklyData = [
    { day: 'Mon', protein: 120 },
    { day: 'Tue', protein: 145 },
    { day: 'Wed', protein: 130 },
    { day: 'Thu', protein: 160 },
    { day: 'Fri', protein: 140 },
    { day: 'Sat', protein: 155 },
    { day: 'Sun', protein: 0 }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadUserData();
    this.loadRecommendedMeals();
    this.loadTodayProtein();
  }

  loadUserData() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        if (user.proteinGoal) {
          this.proteinGoal = user.proteinGoal;
        }
      }
    });
  }

  loadTodayProtein() {
    const today = new Date().toDateString();
    const proteinData = localStorage.getItem(`protein_${today}`);
    if (proteinData) {
      this.currentProtein = parseInt(proteinData);
    }
  }

  loadRecommendedMeals() {
    // Use static mock data for SSR compatibility
    const staticMeals = [
      {
        _id: '1',
        name: 'Grilled Chicken Power Bowl',
        description: 'Perfectly seasoned grilled chicken breast with quinoa, roasted vegetables, and avocado',
        protein_grams: 45,
        carbs_grams: 35,
        fat_grams: 18,
        calories: 450,
        price: 12.99,
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        category: 'main-course',
        dietary_tags: ['gluten-free', 'dairy-free']
      },
      {
        _id: '2',
        name: 'Salmon & Sweet Potato',
        description: 'Wild-caught salmon with roasted sweet potato and steamed broccoli',
        protein_grams: 40,
        carbs_grams: 30,
        fat_grams: 20,
        calories: 420,
        price: 15.99,
        image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
        category: 'main-course',
        dietary_tags: ['keto', 'paleo', 'gluten-free']
      },
      {
        _id: '3',
        name: 'Plant-Based Protein Stack',
        description: 'Black bean and lentil patty with quinoa and mixed greens',
        protein_grams: 25,
        carbs_grams: 40,
        fat_grams: 12,
        calories: 350,
        price: 10.99,
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        category: 'main-course',
        dietary_tags: ['vegan', 'vegetarian', 'gluten-free']
      }
    ];
    // Filter meals based on remaining protein needs
    const remainingProtein = this.proteinGoal - this.currentProtein;
    this.recommendedMeals = staticMeals
      .filter(meal => meal.protein_grams <= remainingProtein + 20)
      .slice(0, 3);
  }

  addQuickProtein() {
    if (this.quickProteinAmount && !isNaN(Number(this.quickProteinAmount))) {
      const amount = Number(this.quickProteinAmount);
      this.currentProtein += amount;
      
      // Save to localStorage
      const today = new Date().toDateString();
      localStorage.setItem(`protein_${today}`, this.currentProtein.toString());
      
      this.quickProteinAmount = '';
      this.loadRecommendedMeals(); // Refresh recommendations
    }
  }

  getProteinPercentage(): number {
    return Math.min((this.currentProtein / this.proteinGoal) * 100, 100);
  }

  getRemainingProtein(): number {
    return Math.max(this.proteinGoal - this.currentProtein, 0);
  }

  getProgressColor(): string {
    const percentage = this.getProteinPercentage();
    if (percentage >= 100) return '#4a7c59';
    if (percentage >= 75) return '#7cb342';
    if (percentage >= 50) return '#ffa726';
    return '#ef5350';
  }

  getMaxWeeklyProtein(): number {
    return Math.max(...this.weeklyData.map(d => d.protein));
  }

  getWeeklyAverage(): number {
    const total = this.weeklyData.reduce((sum, d) => sum + d.protein, 0);
    return Math.round(total / this.weeklyData.length);
  }
}