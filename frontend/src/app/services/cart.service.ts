import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap, catchError, of } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CartItem } from '../models/order.model';
import { Meal } from '../models/meal.model';
import { environment } from '../../environments/environment';
import { AuthService, User } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  private readonly apiUrl = environment.apiUrl?.trim() || 'http://localhost:3000/api';
  
  public cart$ = this.cartSubject.asObservable();
  public cartItems$ = this.cartSubject.asObservable();
  public cartTotal$ = this.cartSubject.pipe(
    map(items => items.reduce((total, item) => total + (item.meal.price * item.quantity), 0))
  );
  public cartItemCount$ = this.cartSubject.pipe(
    map(items => items.reduce((count, item) => count + item.quantity, 0))
  );

  clearCart() {
    this.cartItems = [];
    this.updateCart();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('cart');
    }
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load cart from localStorage first for immediate display
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        this.cartItems = JSON.parse(savedCart);
        this.cartSubject.next(this.cartItems);
      }
    }
    // Then fetch from server to ensure sync, but only if authenticated
    if (this.authService.isAuthenticated()) {
      this.fetchCartFromServer();
    }

    // Subscribe to auth changes to fetch cart when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user && this.authService.isAuthenticated()) {
        this.fetchCartFromServer();
      } else {
        // Clear cart when user logs out
        this.clearCart();
      }
    });
  }

  private getAuthHeaders(): { [key: string]: string } {
    const token = this.authService.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private fetchCartFromServer(): void {
    // Skip server fetch during SSR
    if (typeof window === 'undefined') {
      return;
    }

    const headers = this.getAuthHeaders();
    this.http.get<{items: CartItem[]}>(`${this.apiUrl}/cart`, { headers })
    .pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching cart:', error);
        return of({ items: [] });
      })
    )
    .subscribe(cart => {
      if (cart && cart.items && cart.items.length > 0) {
        this.cartItems = cart.items;
        this.updateCart(false); // Don't sync back to server
      }
    });
  }

  addToCart(meal: Meal, quantity: number = 1, customizations?: string[]): void {
    const existingItemIndex = this.cartItems.findIndex(
      item => item.meal._id === meal._id && 
      JSON.stringify(item.customizations) === JSON.stringify(customizations)
    );

    if (existingItemIndex > -1) {
      this.cartItems[existingItemIndex].quantity += quantity;
    } else {
      this.cartItems.push({ meal, quantity, customizations });
    }

    this.updateCart();
  }

  removeFromCart(mealId: string, customizations?: string[]): void {
    this.cartItems = this.cartItems.filter(
      item => !(item.meal._id === mealId && 
      JSON.stringify(item.customizations) === JSON.stringify(customizations))
    );
    this.updateCart();
  }

  updateQuantity(mealId: string, quantity: number, customizations?: string[]): void {
    const itemIndex = this.cartItems.findIndex(
      item => item.meal._id === mealId && 
      JSON.stringify(item.customizations) === JSON.stringify(customizations)
    );

    if (itemIndex > -1) {
      if (quantity <= 0) {
        this.cartItems.splice(itemIndex, 1);
      } else {
        this.cartItems[itemIndex].quantity = quantity;
      }
      this.updateCart();
    }
  }

  getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  getCartTotal(): number {
    return this.cartItems.reduce((total, item) => {
      return total + (item.meal.price * item.quantity);
    }, 0);
  }

  getCartItemCount(): number {
    return this.cartItems.reduce((count, item) => count + item.quantity, 0);
  }

  private updateCart(syncWithServer: boolean = true): void {
      // Update local state
      this.cartSubject.next([...this.cartItems]);
    
      // Update localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('cart', JSON.stringify(this.cartItems));
      }

      // Sync with server only if authenticated
      if (syncWithServer && this.authService.isAuthenticated()) {
        const headers = this.getAuthHeaders();
        if (!headers['Authorization']) {
          console.log('Skipping cart sync: No auth token available');
          return;
        }

        this.http.post(`${this.apiUrl}/cart`, { items: this.cartItems }, { headers })
          .pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) {
                console.log('Authentication expired, clearing cart...');
                this.clearCart();
                this.authService.logout(); // This will redirect to login
              } else {
                console.error('Error syncing cart with server:', error);
              }
              return of(null);
            })
          )
          .subscribe();
      }
  }
}