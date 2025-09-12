import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  _id?: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
  proteinGoal?: number;
  onboardingCompleted?: boolean;
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
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    this.checkAuth();
  }

  private checkAuth() {
    const token = this.getToken();
    const userData = localStorage.getItem('currentUser');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        user.isAuthenticated = true;
        this.currentUserSubject.next(user);
      } catch (e) {
        this.logout();
      }
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setUserData(response: AuthResponse) {
    if (response && response.token && response.user) {
      const user = { ...response.user, isAuthenticated: true };
      localStorage.setItem('token', response.token);
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Invalid credentials';
      this.logout();
    } else if (error.status === 404) {
      errorMessage = 'User not found';
    } else {
      errorMessage = error.error?.message || 'Server error';
    }
    
    return throwError(() => errorMessage);
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

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  updateUserProfile(userData: Partial<User>): Observable<User> {
    const token = this.getToken();
    return this.http.put<AuthResponse>(
      `${this.API_URL}/auth/profile`,
      userData,
      { headers: { Authorization: `Bearer ${token}` } }
    ).pipe(
      map(response => {
        const updatedUser = { ...this.currentUserSubject.value, ...response.user };
        this.currentUserSubject.next(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        return updatedUser;
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
}