import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const API_URL = (environment.apiUrl || '').replace(/\/$/, '');
  const isServer = typeof window === 'undefined';

  // Skip if running on server
  if (isServer) {
    return next(req);
  }

  // Only add auth header for API requests
  if (req.url.startsWith(API_URL)) {
    const token = localStorage.getItem('token');
    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(authReq);
    }
  }

  return next(req);
};