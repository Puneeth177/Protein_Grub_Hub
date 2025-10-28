import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Meal } from '../../models/meal.model';
import { ReviewListComponent } from '../../components/reviews/review-list.component';



const STATIC_MOCK_MEALS: Meal[] = [
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


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReviewListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit {
  featuredMeals: Meal[] = [];
  isLoading = true;

  constructor() {}

  ngOnInit() {
    // Use static mock data for SSR compatibility
    this.featuredMeals = STATIC_MOCK_MEALS;
    this.isLoading = false;
    // If you want to use real API data on the client, you can add a check for platform-browser here
  }
}