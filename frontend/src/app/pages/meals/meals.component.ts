import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
// import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Meal } from '../../models/meal.model';
import { Subscription } from 'rxjs';

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
  maxPrice = 50;
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

  constructor(private cartService: CartService) {}
  private cartSub?: Subscription;
  // map mealId -> quantity in cart
  cartMap: { [mealId: string]: number } = {};

  ngOnDestroy(): void {
    if (this.cartSub) this.cartSub.unsubscribe();
  }
  ngOnInit() {
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
    this.meals = staticMeals;
    this.filteredMeals = staticMeals;
    this.isLoading = false;
    this.applyFilters();

    // Subscribe to cart updates so UI reflects quantities
    this.cartSub = this.cartService.cart$.subscribe(items => {
      this.cartMap = {};
      if (items && items.length) {
        items.forEach((it: any) => {
          if (it && it.meal && it.meal._id) {
            this.cartMap[it.meal._id] = it.quantity || 0;
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

  getQuantity(mealId: string): number {
    return this.cartMap[mealId] || 0;
  }

  increase(event: Event, meal: Meal) {
    event?.stopPropagation();
    event?.preventDefault();
    this.cartService.addToCart(meal, 1);
  }

  decrease(event: Event, meal: Meal) {
    event?.stopPropagation();
    event?.preventDefault();
    const current = this.getQuantity(meal._id);
    if (current > 1) {
      this.cartService.updateQuantity(meal._id, current - 1);
    } else {
      this.cartService.removeFromCart(meal._id);
    }
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
    if (this.minPrice > 0 || this.maxPrice < 50) count++;
    if (this.selectedDietary.length > 0) count++;
    return count;
  }
}