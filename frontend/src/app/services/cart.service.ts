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
    this.http.get<{ cart?: { items: CartItem[] }, warnings?: any[] }>(`${this.apiUrl}/cart`, { headers })
    .pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching cart:', error);
        return of({ cart: { items: [] }, warnings: [] });
      })
    )
    .subscribe(resp => {
      const items = resp?.cart?.items ?? [];
      if (Array.isArray(items)) {
        this.cartItems = items;
        this.updateCart(false); // Don't sync back to server
        if (resp?.warnings?.length) {
          console.warn('Cart warnings:', resp.warnings);
        }
      }
    });
  }

  addToCart(meal: Meal, quantity: number = 1, customizations?: string[]): void {
    const normArr = (v: any) => JSON.stringify(Array.isArray(v) ? v : []);
    const existingItemIndex = this.cartItems.findIndex(
      item => item.meal._id === meal._id &&
      normArr(item.customizations) === normArr(customizations)
    );

    if (existingItemIndex > -1) {
      this.cartItems[existingItemIndex].quantity += quantity;
    } else {
      this.cartItems.push({ meal, quantity, customizations: Array.isArray(customizations) ? customizations : [] });
    }

    this.updateCart();
  }

  removeFromCart(mealId: string, customizations?: string[], mealName?: string): void {
    console.log('[CartService] removeFromCart', { mealId, mealName });
    const normArr = (v: any) => JSON.stringify(Array.isArray(v) ? v : []);
    const normName = (s?: string) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '').trim();
    const aliasCanon = (s?: string) => {
      const m: Record<string, string> = {
        'grilled chicken power bowl': 'high protein chicken bowl',
        'salmon & sweet potato': 'salmon protein pack',
        'plant-based protein stack': 'turkey protein wrap'
      };
      const key = String(s || '').toLowerCase();
      return m[key] || s || '';
    };

    let removed = false;
    const beforeLen = this.cartItems.length;
    this.cartItems = this.cartItems.filter(item => {
      const idMatch = item.meal._id === mealId && normArr(item.customizations) === normArr(customizations);
      const cnItem = normName(aliasCanon(item.meal?.name));
      const cnReq = normName(aliasCanon(mealName));
      const nameMatch = !!mealName && cnItem === cnReq && normArr(item.customizations) === normArr(customizations);
      const toRemove = idMatch || nameMatch;
      if (toRemove) removed = true;
      return !toRemove;
    });
    if (removed || this.cartItems.length !== beforeLen) this.updateCart();
  }

  updateQuantity(mealId: string, quantity: number, customizations?: string[], mealName?: string): void {
    console.log('[CartService] updateQuantity', { mealId, quantity, mealName });
    const normArr = (v: any) => JSON.stringify(Array.isArray(v) ? v : []);
    const normName = (s?: string) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '').trim();
    const aliasCanon = (s?: string) => {
      const m: Record<string, string> = {
        'grilled chicken power bowl': 'high protein chicken bowl',
        'salmon & sweet potato': 'salmon protein pack',
        'plant-based protein stack': 'turkey protein wrap'
      };
      const key = String(s || '').toLowerCase();
      return m[key] || s || '';
    };

    let itemIndex = this.cartItems.findIndex(
      item => item.meal._id === mealId &&
      normArr(item.customizations) === normArr(customizations)
    );

    if (itemIndex < 0 && mealName) {
      const reqKey = normName(aliasCanon(mealName));
      itemIndex = this.cartItems.findIndex(item => {
        const itemKey = normName(aliasCanon(item.meal?.name));
        return itemKey === reqKey && normArr(item.customizations) === normArr(customizations);
      });
    }

    if (itemIndex > -1) {
      if (quantity <= 0) {
        this.cartItems.splice(itemIndex, 1);
      } else {
        this.cartItems[itemIndex].quantity = quantity;
      }
      this.updateCart();
    } else {
      console.warn('[CartService] No matching item found for updateQuantity', { mealId, mealName });
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
      console.log('[CartService] next cart', this.cartItems.map(i => ({ id: i.meal._id, name: i.meal.name, qty: i.quantity })));
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

        // Build minimal payload the backend expects
        const itemsPayload = this.cartItems.map(ci => {
          const id = ci?.meal?._id;
          const isValidId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
            return isValidId
            ? { productId: id, quantity: ci.quantity, customizations: ci.customizations }
            : {
                meal: {
                  _id: id,
                  name: ci?.meal?.name,
                  price: ci?.meal?.price,
                  description: ci?.meal?.description ?? (ci as any)?.meal?.desc,
                  calories: ci?.meal?.calories,
                  protein_grams: ci?.meal?.protein_grams ?? (ci as any)?.meal?.protein,
                  image_url: ci?.meal?.image_url
                },
                quantity: ci.quantity,
                customizations: ci.customizations
              };
        });

        this.http.post<{ cart?: { items: CartItem[] }, warnings?: any[] }>(`${this.apiUrl}/cart`, { items: itemsPayload }, { headers })
          .pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) {
                console.log('Authentication expired, clearing cart...');
                this.clearCart();
                try {
                  this.authService.logout(false);
                } catch (e) {
                  try { (this.authService as any).logout(); } catch (_) {}
                }
              } else {
                console.error('Error syncing cart with server:', error);
              }
              return of(null);
            })
          )
          .subscribe(resp => {
            const items = resp?.cart?.items;
            if (Array.isArray(items)) {
              this.cartItems = items;
              // Reflect authoritative server reconciliation locally without re-posting
              this.updateCart(false);
            }
            if (resp?.warnings?.length) {
              console.warn('Cart warnings:', resp.warnings);
            }
          });
      }
  }
}