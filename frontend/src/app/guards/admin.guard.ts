import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.currentUser$.pipe(
    take(1),
    map(user => {
      const isAdmin = !!(user as any)?.isAdmin;
      if (!isAdmin) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
