import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        // Only allow access to onboarding for new users who haven't completed it
        if (user && !user.onboardingCompleted) {
          return true;
        }
        this.router.navigate(['/']);
        return false;
      })
    );
  }
}