import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ThemeService } from '../../services/theme.service';
import { NavAvatarComponent } from '../nav-avatar/nav-avatar.component';
import { Observable, Subscription, map } from 'rxjs';
import { DietModeService } from '../../services/diet-mode.service';
import type { DietMode } from '../../services/diet-mode.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NavAvatarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<any>;
  cartItemCount$: Observable<number>;
  isDark$!: Observable<boolean>;

  // Separate states
  isNavOpen = false;
  isUserMenuOpen = false;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private themeService: ThemeService,
    private dietMode: DietModeService
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.cartItemCount$ = this.cartService.cartItemCount$;
  }

  diet: DietMode = 'neutral';
  private modeSub?: Subscription;

  ngOnInit() {
    this.modeSub = this.dietMode.getMode$().subscribe(mode => this.diet = mode);
    this.isDark$ = this.themeService.currentTheme$.pipe(map(t => t.isDark));
  }

  toggleNavMenu() {
    this.isNavOpen = !this.isNavOpen;
  }

  toggleUserMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click')
  onDocumentClick() {
    if (this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  logout() {
    this.authService.logout();
    this.isUserMenuOpen = false;
  }

  setDiet(mode: DietMode) { this.dietMode.setMode(mode); }
  cycleDiet() { this.dietMode.toggleNext(); }

  getCartItemCount(): Observable<number> {
    return this.cartItemCount$;
  }

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  onDietModeToggle() {
    this.cycleDiet();
  }
}