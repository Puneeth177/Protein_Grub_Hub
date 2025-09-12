import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Meal } from '../models/meal.model';
import { User } from '../models/user.model';

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl?.trim() || 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if we're in browser environment before accessing localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        this.currentUserSubject.next(JSON.parse(savedUser));
      }
    }
  }

  // Authentication Methods
  register(userData: UserRegistration): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData).pipe(
      catchError(this.handleError)
    );
  }

  login(credentials: UserLogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response.user && typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
          localStorage.setItem('onboardingData', JSON.stringify({
            fitnessGoal: response.user.fitnessGoal,
            dietaryPreferences: response.user.dietaryPreferences,
            healthInfo: response.user.healthInfo,
            completedAt: new Date().toISOString()
          }));
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError((error) => {
        if (error.status === 400) {
          return throwError(() => new Error(error.error.message || 'Invalid credentials'));
        }
        return this.handleError(error);
      })
    );
  }

  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
  }

  /**
   * Fetches all meals from the catalog.
   * @returns An observable of an array of Meals.
   */
  getMeals(): Observable<Meal[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products`).pipe(
      map(products => products.map(product => this.mapProductToMeal(product))),
      catchError(this.handleError)
    );
  }

  /**
   * Get meal by ID
   * @param id The meal ID
   * @returns An observable of a single Meal
   */
  getMealById(id: string): Observable<Meal> {
    return this.http.get<any>(`${this.apiUrl}/products/${id}`).pipe(
      map(product => this.mapProductToMeal(product)),
      catchError(this.handleError)
    );
  }

  /**
   * Search meals by criteria
   * @param criteria The search criteria
   * @returns An observable of filtered Meals
   */
  searchMeals(criteria: { [key: string]: any }): Observable<Meal[]> {
    const params = new HttpParams({ fromObject: criteria });
    return this.http.get<any[]>(`${this.apiUrl}/products`, { params }).pipe(
      map(products => products.map(product => this.mapProductToMeal(product))),
      catchError(this.handleError)
    );
  }

  /**
   * Maps a product from the backend to the frontend Meal model
   */
  private mapProductToMeal(product: any): Meal {
    return {
      _id: product._id,
      name: product.name,
      description: product.desc,
      protein_grams: product.protein,
      carbs_grams: product.carbs,
      fat_grams: product.fat,
      calories: product.calories,
      price: product.price,
      category: product.category.toLowerCase(),
      image_url: product.image_url || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400`,
      dietary_tags: product.dietary_tags || []
    };
  }

  /**
   * A generic and private error handler for HTTP requests.
   */
  private handleError(error: HttpErrorResponse) {
    console.error(`Backend returned code ${error.status}, body was: `, error.error);
    return throwError(() => new Error(error.error?.message || 'Something bad happened; please try again later.'));
  }
}