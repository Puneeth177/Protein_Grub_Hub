import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Meal } from '../../models/meal.model';
import { Subscription } from 'rxjs';
import { DietModeService, DietMode } from '../../services/diet-mode.service';

@Component({
  selector: 'app-meals',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './meals.component.html',
  styleUrls: ['./meals.component.css']
})
export class MealsComponent implements OnInit, OnDestroy {
  meals: Meal[] = [];
  filteredMeals: Meal[] = [];
  isLoading = true;
  
  // Filters
  searchTerm = '';
  selectedCategory = '';
  minProtein = 0;
  maxProtein = 100;
  minPrice = 0;
  maxPrice = 500;
  selectedDietary: string[] = [];
  sortBy = 'name';
  
  categories = [
    { id: '', label: 'All Categories' },
    { id: 'main-course', label: 'Main Course' },
    { id: 'snack', label: 'Snacks' },
    { id: 'supplement', label: 'Supplements' },
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' }
  ];
  
  dietaryOptions = [
    { id: 'vegan', label: 'Vegan' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'keto', label: 'Keto' },
    { id: 'paleo', label: 'Paleo' },
    { id: 'gluten-free', label: 'Gluten-Free' },
    { id: 'dairy-free', label: 'Dairy-Free' }
  ];
  
  sortOptions = [
    { id: 'name', label: 'Name' },
    { id: 'protein', label: 'Protein (High to Low)' },
    { id: 'price', label: 'Price (Low to High)' },
    { id: 'calories', label: 'Calories (Low to High)' }
  ];

  private cartSub?: Subscription;
  // map of client mealId and name-based keys to quantity in cart
  cartMap: { [key: string]: number } = {};

  constructor(private cartService: CartService, private dietModeService: DietModeService, private apiService: ApiService) {}
  private modeSub?: Subscription;
  private dietMode: DietMode = 'neutral';

ngOnDestroy(): void {
  if (this.cartSub) this.cartSub.unsubscribe();
  if (this.modeSub) this.modeSub.unsubscribe();
}
  ngOnInit() {
    // Fetch meals from API
    this.modeSub = this.dietModeService.getMode$().subscribe(mode => {
      this.dietMode = mode;
      this.applyFilters();
    });
    
    // Load meals from API
    this.apiService.getMeals().subscribe({
      next: (meals: Meal[]) => {
        this.meals = meals;
        this.filteredMeals = this.meals;
        this.isLoading = false;
        this.applyFilters();
      },
      error: (err: any) => {
        console.error('Error loading meals:', err);
        this.isLoading = false;
      }
    });

    // Subscribe to cart updates so UI reflects quantities
    this.cartSub = this.cartService.cart$.subscribe(items => {
      this.cartMap = {};
      if (items && items.length) {
        items.forEach((it: any) => {
          if (it && it.meal) {
            const qty = it.quantity || 0;
            if (it.meal._id) {
              this.cartMap[it.meal._id] = qty;
            }
            if (it.meal.name) {
              const canon = this.aliasCanon(it.meal.name);
              const normCanon = this.normName(canon);
              const normRaw = this.normName(it.meal.name);

              // raw and canonical name keys
              this.cartMap[`name:${it.meal.name}`] = qty;
              this.cartMap[`name:${canon}`] = qty;
              this.cartMap[`norm:${normRaw}`] = qty;
              this.cartMap[`norm:${normCanon}`] = qty;

              // also map to the client-side static id when available (match either raw or canonical)
              const clientMatch = this.meals.find(m => {
                const mNorm = this.normName(m.name);
                return mNorm === normCanon || mNorm === normRaw;
              });
              if (clientMatch) {
                this.cartMap[clientMatch._id] = qty;
              }
            }
          }
        });
      }
    });
  }

  applyFilters() {
    let filtered = [...this.meals];

    // Search filter
    if (this.searchTerm) {
      filtered = filtered.filter(meal =>
        meal.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        meal.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(meal => meal.category === this.selectedCategory);
    }

    // Protein range filter
    filtered = filtered.filter(meal =>
      meal.protein_grams >= this.minProtein && meal.protein_grams <= this.maxProtein
    );

    // Price range filter
    filtered = filtered.filter(meal =>
      meal.price >= this.minPrice && meal.price <= this.maxPrice
    );

    // Dietary preferences filter
    if (this.selectedDietary.length > 0) {
      filtered = filtered.filter(meal =>
        this.selectedDietary.some(diet => meal.dietary_tags.includes(diet))
      );
    }

    // Diet mode filter (neutral shows all)
    if (this.dietMode === 'veg') {
      filtered = filtered.filter(m =>
        m.dietary_tags?.some(t => t === 'vegetarian' || t === 'vegan')
      );
    } else if (this.dietMode === 'nonveg') {
      filtered = filtered.filter(m =>
        !(m.dietary_tags?.some(t => t === 'vegetarian' || t === 'vegan'))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'protein':
          return b.protein_grams - a.protein_grams;
        case 'price':
          return a.price - b.price;
        case 'calories':
          return a.calories - b.calories;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    this.filteredMeals = filtered;
  }

  toggleDietaryFilter(dietary: string) {
    const index = this.selectedDietary.indexOf(dietary);
    if (index > -1) {
      this.selectedDietary.splice(index, 1);
    } else {
      this.selectedDietary.push(dietary);
    }
    this.applyFilters();
  }

  addToCart(event: Event, meal: Meal) {
    // Prevent any parent click handlers / navigation
    event?.stopPropagation();
    event?.preventDefault();
    this.cartService.addToCart(meal, 1);
    // You could add a toast notification here
  }

  getQuantity(mealId: string, mealName?: string): number {
    const byId = this.cartMap[mealId];
    if (byId) return byId;
    if (mealName) {
      const canon = this.aliasCanon(mealName);
      const byName = this.cartMap[`name:${mealName}`] || this.cartMap[`name:${canon}`];
      if (byName) return byName;
      const byNorm = this.cartMap[`norm:${this.normName(mealName)}`] || this.cartMap[`norm:${this.normName(canon)}`];
      if (byNorm) return byNorm;
    }
    return 0;
  }

  private normName(s?: string): string {
    return String(s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  private aliasCanon(s?: string): string {
    const name = String(s || '');
    const map: Record<string, string> = {
      'Grilled Chicken Power Bowl': 'High Protein Chicken Bowl',
      'Salmon & Sweet Potato': 'Salmon Protein Pack',
      'Plant-Based Protein Stack': 'Turkey Protein Wrap'
    };
    return map[name] || name;
  }

  increase(event: Event, meal: Meal) {
    event?.stopPropagation();
    event?.preventDefault();
    const existing = this.cartService.getCartItems().find(it => {
      const a = this.aliasCanon(this.normName(it?.meal?.name));
      const b = this.aliasCanon(this.normName(meal.name));
      return a === b;
    });

    if (existing?.meal?._id) {
      const current = this.getQuantity(meal._id, meal.name);
      this.cartService.updateQuantity(existing.meal._id, current + 1, undefined, meal.name);
    } else {
      this.cartService.addToCart(meal, 1);
    }
  }

  decrease(event: Event, meal: Meal) {
    event?.stopPropagation();
    event?.preventDefault();
    const current = this.getQuantity(meal._id, meal.name);
    const existing = this.cartService.getCartItems().find(it => {
      const a = this.aliasCanon(this.normName(it?.meal?.name));
      const b = this.aliasCanon(this.normName(meal.name));
      return a === b;
    });
    const targetId = existing?.meal?._id || meal._id;

    if (current > 1) {
      this.cartService.updateQuantity(targetId, current - 1, undefined, meal.name);
    } else {
      this.cartService.removeFromCart(targetId, undefined, meal.name);
    }
  }

  trackByMeal(index: number, meal: Meal) {
    return meal?._id || meal?.name || index;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.minProtein = 0;
    this.maxProtein = 100;
    this.minPrice = 0;
    this.maxPrice = 50;
    this.selectedDietary = [];
    this.sortBy = 'name';
    this.applyFilters();
  }

  getFilterCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedCategory) count++;
    if (this.minProtein > 0 || this.maxProtein < 100) count++;
    if (this.minPrice > 0 || this.maxPrice < 500) count++;
    if (this.selectedDietary.length > 0) count++;
    return count;
  }
}