import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Meal } from '../../models/meal.model';
import { Subscription } from 'rxjs';
import { DietModeService, DietMode } from '../../services/diet-mode.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-supplements',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './supplements.component.html',
  styleUrls: ['./supplements.component.css']
})
export class SupplementsComponent implements OnInit, OnDestroy {
  meals: Meal[] = [];
  filteredMeals: Meal[] = [];
  isLoading = true;

  // Filters
  searchTerm = '';
  selectedCategory = 'supplement';
  minProtein = 0;
  maxProtein = 100;
  minPrice = 0;
  maxPrice = 10000;
  // For Supplements, use tag-based filters (bar, powder, isolate)
  selectedDietary: string[] = [];
  sortBy = 'name';

  // Category dropdown removed from UI; keep internal value only
  categories = [] as any[];

  // Replace dietary filters with tag filters relevant to supplements
  dietaryOptions = [
    { id: 'bar', label: 'Bar' },
    { id: 'powder', label: 'Powder' },
    { id: 'isolate', label: 'Isolate' }
  ];

  sortOptions = [
    { id: 'name', label: 'Name' },
    { id: 'protein', label: 'Protein (High to Low)' },
    { id: 'price', label: 'Price (Low to High)' },
    { id: 'calories', label: 'Calories (Low to High)' }
  ];

  private cartSub?: Subscription;
  private modeSub?: Subscription;
  private dietMode: DietMode = 'neutral';

  // map of client mealId and name-based keys to quantity in cart
  cartMap: { [key: string]: number } = {};

  constructor(
    private cartService: CartService,
    private dietModeService: DietModeService,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnDestroy(): void {
    if (this.cartSub) this.cartSub.unsubscribe();
    if (this.modeSub) this.modeSub.unsubscribe();
  }

  ngOnInit() {
    this.modeSub = this.dietModeService.getMode$().subscribe(mode => {
      this.dietMode = mode;
      this.applyFilters();
    });

    // Do not preload general dietary preferences for supplements tag filters

    this.apiService.getMeals().subscribe({
      next: (meals: Meal[]) => {
        // Pre-filter to supplements domain by default; keep full list for category switch
        this.meals = meals;
        this.filteredMeals = this.meals;
        this.isLoading = false;
        this.applyFilters();
      },
      error: (err: any) => {
        console.error('Error loading supplements:', err);
        this.isLoading = false;
      }
    });

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

              this.cartMap[`name:${it.meal.name}`] = qty;
              this.cartMap[`name:${canon}`] = qty;
              this.cartMap[`norm:${normRaw}`] = qty;
              this.cartMap[`norm:${normCanon}`] = qty;

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

    // Limit to supplements by default
    if (this.selectedCategory) {
      filtered = filtered.filter(meal => meal.category === this.selectedCategory);
    }

    if (this.searchTerm) {
      filtered = filtered.filter(meal =>
        meal.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        meal.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    filtered = filtered.filter(meal =>
      meal.protein_grams >= this.minProtein && meal.protein_grams <= this.maxProtein
    );

    filtered = filtered.filter(meal =>
      meal.price >= this.minPrice && meal.price <= this.maxPrice
    );

    // Tag-based filters (bar, powder, isolate) - require ALL selected tags
    if (this.selectedDietary.length > 0) {
      filtered = filtered.filter(meal => {
        const tags = Array.isArray(meal.tags) ? meal.tags.map(t => String(t).toLowerCase()) : [];
        return this.selectedDietary.every(tag => tags.includes(tag));
      });
    }

    // Diet mode: explicit behavior for supplements
    if (this.dietMode === 'veg') {
      filtered = filtered.filter(m => {
        const tags = this.mapDietaryTags(m);
        return tags.includes('vegetarian') || tags.includes('vegan');
      });
    } else if (this.dietMode === 'nonveg') {
      filtered = filtered.filter(m => {
        const tags = this.mapDietaryTags(m);
        return tags.includes('nonveg');
      });
    }

    filtered.sort((a, b) => {
      const aInv = Number(a?.inventory);
      const bInv = Number(b?.inventory);
      const aOOS = Number.isFinite(aInv) && aInv <= 0 ? 1 : 0;
      const bOOS = Number.isFinite(bInv) && bInv <= 0 ? 1 : 0;
      if (aOOS !== bOOS) return aOOS - bOOS;

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

  private mapDietaryTags(m: Meal): string[] {
    const d = Array.isArray(m.dietary_tags) ? m.dietary_tags.map(t => String(t).toLowerCase()) : [];
    if (d.length > 0) return d;
    const g = (m as any).tags as string[] | undefined;
    const lower = Array.isArray(g) ? g.map(t => String(t).toLowerCase()) : [];
    const nameL = String(m?.name || '').toLowerCase();
    const descL = String(m?.description || (m as any)?.desc || '').toLowerCase();
    const derived: string[] = [];
    if (lower.includes('vegan')) derived.push('vegan');
    if (lower.includes('vegetarian')) derived.push('vegetarian');
    if (lower.includes('plant-based') || lower.includes('plantbased')) derived.push('plant-based');
    if (lower.includes('high-protein') || lower.includes('highprotein') || lower.includes('protein-pack') || lower.includes('protein')) derived.push('high-protein');
    if (lower.includes('keto')) derived.push('keto');
    if (lower.includes('paleo')) derived.push('paleo');
    if (lower.includes('gluten-free') || lower.includes('glutenfree')) derived.push('gluten-free');
    if (lower.includes('dairy-free') || lower.includes('dairyfree')) derived.push('dairy-free');
    // Detect explicit non-veg (egg/meat/fish/chicken)
    const eggRegex = /\begg\b|\begg\s*white\b|\begg-white\b/;
    const meatFishRegex = /\b(fish|salmon|tuna|beef|mutton|prawn|shrimp|meat|chicken)\b/;
    const mentionsNonVeg = lower.includes('non-veg') || lower.includes('nonveg') || eggRegex.test(nameL) || eggRegex.test(descL) || meatFishRegex.test(nameL) || meatFishRegex.test(descL);
    if (mentionsNonVeg) derived.push('nonveg');
    // If not explicitly vegan or nonveg, default supplements to vegetarian
    const unique = Array.from(new Set(derived));
    if (!unique.includes('vegan') && !unique.includes('nonveg')) {
      unique.push('vegetarian');
    }
    // If explicitly veg or vegan, remove nonveg tag to avoid conflicts
    if (unique.includes('vegetarian') || unique.includes('vegan')) {
      return unique.filter(t => t !== 'nonveg');
    }
    return unique;
  }

  toggleDietaryFilter(dietary: string) {
    const index = this.selectedDietary.indexOf(dietary);
    if (index > -1) {
      this.selectedDietary.splice(index, 1);
    } else {
      this.selectedDietary.push(dietary);
    }
    this.applyFilters();
    // Do not persist tag filter selections as user dietary preferences
  }

  clearDietary() {
    this.selectedDietary = [];
    this.applyFilters();
  }

  addToCart(event: Event, meal: Meal) {
    event?.stopPropagation();
    event?.preventDefault();
    this.cartService.addToCart(meal, 1);
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
    this.selectedCategory = 'supplement';
    this.minProtein = 0;
    this.maxProtein = 100;
    this.minPrice = 0;
    this.maxPrice = 10000;
    this.selectedDietary = [];
    this.sortBy = 'name';
    this.applyFilters();
  }

  getFilterCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedCategory && this.selectedCategory !== 'supplement') count++;
    if (this.minProtein > 0 || this.maxProtein < 100) count++;
    if (this.minPrice > 0 || this.maxPrice < 500) count++;
    if (this.selectedDietary.length > 0) count++;
    return count;
  }
}
