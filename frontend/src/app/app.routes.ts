import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding.component').then(m => m.OnboardingComponent),
    canActivate: [authGuard],
    data: { onboardingRequired: true }
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'meals',
    loadComponent: () => import('./pages/meals/meals.component').then(m => m.MealsComponent)
  },
  {
    path: 'supplements',
    loadComponent: () => import('./pages/supplements/supplements.component').then(m => m.SupplementsComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent),
    // Allow unauthenticated users to view/edit their cart locally.
    // Checkout should remain protected, but viewing the cart does not require authentication.
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'orders/:orderId',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent)
  },
  {
    path: 'meals/:id',
    loadComponent: () => import('./pages/meals/meals.component').then(m => m.MealsComponent)
  },
  {
    path: 'payment/:orderId',
    loadComponent: () => import('./pages/payment/payment').then(m => m.Payment),
    canActivate: [authGuard]
  },
  {
    path: 'order-success/:orderId',
    loadComponent: () => import('./pages/order-success/order-success.component').then(m => m.OrderSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
