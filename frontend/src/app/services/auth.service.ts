import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export interface HealthInfo {
  age: string;
  weight: string;
  height: string;
  activityLevel: string;
}

export interface User {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
  proteinGoal?: number;
  onboardingCompleted?: boolean;
  fitnessGoal?: string;
  dietaryPreferences?: string[];
  healthInfo?: HealthInfo;
  avatar?: {
    url?: string;
    id?: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private readonly API_URL = environment.apiUrl?.trim() || 'http://localhost:3000/api';

  private isServer = typeof window === 'undefined';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private storageService: StorageService
  ) {
    if (!this.isServer) {
      this.checkAuth();
    }
  }

  private checkAuth() {
    try {
      const token = this.getToken();
      const userData = this.getStorageItem('currentUser');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        user.isAuthenticated = true;
        this.currentUserSubject.next(user);
      }
    } catch (e) {
      this.logout();
    }
  }

  public getToken(): string | null {
    return this.storageService.getItem('token');
  }

  private getStorageItem(key: string): string | null {
    return this.storageService.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    this.storageService.setItem(key, value);
  }

  private setUserData(response: AuthResponse) {
    if (response && response.token && response.user) {
      const respUser: any = response.user || {};
      const prevAvatar = this.currentUserSubject.value?.avatar?.url || null;
      const avatarUrl = respUser.avatar?.url || respUser.avatarUrl || prevAvatar || null;

      const user: User = {
        ...respUser,
        isAuthenticated: true,
        avatar: { url: avatarUrl || undefined }
      };

      // Remove stray avatarUrl if present to keep a single source of truth
      delete (user as any).avatarUrl;

      this.setStorageItem('token', response.token);
      this.setStorageItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  private getStoredRedirectUrl(): string {
    const redirectUrl = this.storageService.getItem('redirectUrl');
    return redirectUrl || '/';
  }

  public setRedirectUrl(url: string): void {
    if (url && !url.includes('/login') && !url.includes('/register')) {
      this.storageService.setItem('redirectUrl', url);
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Invalid credentials';
      // Only logout on auth-related endpoints
      if (error.url?.includes('/auth/')) {
        this.logout();
      }
    } else if (error.status === 404) {
      errorMessage = 'User not found';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else {
      errorMessage = error.error?.message || `Server error (${error.status})`;
    }
    
    return throwError(() => ({ message: errorMessage, statusCode: error.status }));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, { email, password })
      .pipe(
        tap(response => this.setUserData(response)),
        catchError(error => this.handleError(error))
      );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, { name, email, password })
      .pipe(
        tap(response => this.setUserData(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Sign in / Sign up using Google ID token (issued by Google Identity Services).
   * Server will verify the token and return the application's AuthResponse (token + user).
   */
  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/google`, { idToken })
      .pipe(
        tap(response => this.setUserData(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Log out the current user.
   * @param redirect If true (default) navigate to the login page. Set to false to clear auth silently.
   */
  logout(redirect: boolean = true) {
    this.storageService.removeItem('token');
    this.storageService.removeItem('currentUser');
    this.currentUserSubject.next(null);
    if (redirect) {
      this.router.navigate(['/login']);
    }
  }

  updateUserProfile(userData: Partial<User>): Observable<User> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => 'No authentication token found');
    }
    
    return this.http.put<AuthResponse>(
      `${this.API_URL}/auth/profile`,
      userData,
      { headers: { Authorization: `Bearer ${token}` } }
    ).pipe(
      map(response => {
        if (!response?.user) {
          throw new Error('Invalid response from server');
        }
        const respUser: any = response.user || {};
        const avatarUrl = respUser.avatar?.url || respUser.avatarUrl || null;

        const normalized = {
          ...this.currentUserSubject.value,
          ...respUser,
          avatar: { url: avatarUrl || undefined }
        };
        delete (normalized as any).avatarUrl;

        this.currentUserSubject.next(normalized as User);
        this.storageService.setItem('currentUser', JSON.stringify(normalized));
        return normalized as User;
      }),
      catchError(error => this.handleError(error))
    );
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value?.isAuthenticated;
  }

  redirectToSavedUrl() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }

  // Add these methods to fix the errors
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateAvatar(avatarUrl: string) {
    const token = this.getToken();
    if (!token) {
      return throwError(() => 'No authentication token found');
    }

    return this.http.put<AuthResponse>(
      `${this.API_URL}/auth/profile`,
      { avatarUrl }, // backend expects this shape
      { headers: { Authorization: `Bearer ${token}` } }
    ).pipe(
      map(response => {
        if (!response?.user) throw new Error('Invalid response from server');
        const respUser: any = response.user || {};
        const normalized = {
          ...this.currentUserSubject.value,
          ...respUser,
          avatar: { url: respUser.avatar?.url || respUser.avatarUrl || undefined }
        };
        delete (normalized as any).avatarUrl;
        this.currentUserSubject.next(normalized as User);
        this.storageService.setItem('currentUser', JSON.stringify(normalized));
        return normalized as User;
      }),
      catchError(error => this.handleError(error))
    );
  }

  updateUser(userData: Partial<User>): Observable<User> {
    return this.updateUserProfile(userData);
  }

  // Update current user locally and persist to storage
  setCurrentUser(user: User) {
    const updated = { ...user, isAuthenticated: true };
    this.currentUserSubject.next(updated);
    this.storageService.setItem('currentUser', JSON.stringify(updated));
  }
}