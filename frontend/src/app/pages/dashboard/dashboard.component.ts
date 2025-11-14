import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ApiService } from '../../services/api.service';
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
  private quickAddedToday = 0;
  recommendedMeals: Meal[] = [];
  weeklyData = [
    { day: 'Mon', protein: 0 },
    { day: 'Tue', protein: 0 },
    { day: 'Wed', protein: 0 },
    { day: 'Thu', protein: 0 },
    { day: 'Fri', protein: 0 },
    { day: 'Sat', protein: 0 },
    { day: 'Sun', protein: 0 }
  ];

  constructor(private authService: AuthService, private orderService: OrderService, private api: ApiService) {}

  ngOnInit() {
    this.loadUserData();
    this.loadRecommendedMeals();
    this.loadTodayProtein();
    this.loadOrdersProtein();
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
      this.quickAddedToday = parseInt(proteinData);
    }
  }

  loadRecommendedMeals() {
    // Use live products API; fallback to empty on error
    this.api.getMeals().subscribe({
      next: (meals: Meal[]) => {
        const remainingProtein = this.proteinGoal - this.currentProtein;
        // Prefer in-stock meals and roughly within need+20g
        const sorted = [...meals]
          .filter(m => (m.inventory ?? 1) > 0)
          .sort((a,b) => Math.abs((remainingProtein) - a.protein_grams) - Math.abs((remainingProtein) - b.protein_grams));
        this.recommendedMeals = sorted.filter(m => m.protein_grams <= remainingProtein + 20).slice(0,3);
      },
      error: () => {
        this.recommendedMeals = [];
      }
    });
  }

  addQuickProtein() {
    if (this.quickProteinAmount && !isNaN(Number(this.quickProteinAmount))) {
      const amount = Number(this.quickProteinAmount);
      this.quickAddedToday += amount;
      this.currentProtein += amount;
      
      // Save to localStorage
      const today = new Date().toDateString();
      localStorage.setItem(`protein_${today}`, String(this.quickAddedToday));
      
      this.quickProteinAmount = '';
      // Update today's bar in weeklyData
      const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short' });
      this.weeklyData = this.weeklyData.map(d => d.day === todayLabel ? { ...d, protein: d.protein + amount } : d);
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

  private getStartOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0,0,0,0);
    return x;
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private getOrderProtein(order: any): number {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.reduce((sum: number, it: any) => sum + ((it?.meal?.protein_grams || 0) * (it?.quantity || 0)), 0);
  }

  loadOrdersProtein() {
    this.orderService.getOrders().subscribe({
      next: (orders: any[]) => {
        const completed = (orders || []).filter(o => (o?.status || '').toLowerCase() === 'completed');
        const today = new Date();
        const startToday = this.getStartOfDay(today);

        const proteinFromOrdersToday = completed
          .filter(o => this.sameDay(new Date(o.created), startToday))
          .reduce((sum, o) => sum + this.getOrderProtein(o), 0);
        this.currentProtein = proteinFromOrdersToday + this.quickAddedToday;

        const days: { day: string; protein: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const start = this.getStartOfDay(d);
          const label = start.toLocaleDateString(undefined, { weekday: 'short' });
          let grams = completed
            .filter(o => this.sameDay(new Date(o.created), start))
            .reduce((sum, o) => sum + this.getOrderProtein(o), 0);
          // Add quick-added protein for today into today's bar
          if (this.sameDay(start, startToday)) grams += this.quickAddedToday;
          days.push({ day: label, protein: grams });
        }
        this.weeklyData = days;
        this.loadRecommendedMeals();
      },
      error: () => {}
    });
  }
}