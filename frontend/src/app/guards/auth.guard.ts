import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const isServer = typeof window === 'undefined';

  // During SSR, allow the route to be rendered
  if (isServer) {
    return true;
  }

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // If the user is not authenticated
      if (!user?.isAuthenticated) {
        // Store the return URL and redirect to login
        const returnUrl = state.url;
        if (!isServer) {
          sessionStorage.setItem('returnUrl', returnUrl);
        }
        router.navigate(['/login']);
        return false;
      }

      // If this is an onboarding route, only allow access if onboarding is not completed
      if (route.data['onboardingRequired']) {
        if (!user.onboardingCompleted) {
          return true; // Allow access to onboarding for new users
        }
        router.navigate(['/']); // Redirect completed users to home
        return false;
      }

      // For all other protected routes
      return true;
    })
  );
};