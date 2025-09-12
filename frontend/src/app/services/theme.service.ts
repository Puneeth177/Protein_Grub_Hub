import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Theme {
  id: string;
  name: string;
  displayName: string;
  isDark: boolean;
  colors?: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

// Duplicate class and interface definitions removed. Only one ThemeService class remains below.
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themes: Theme[] = [
    {
      id: 'forest-green',
      name: 'forest-green',
      displayName: 'Forest Green',
      isDark: false
    },
    {
      id: 'dark-forest',
      name: 'dark-forest',
      displayName: 'Dark Forest',
      isDark: true
    },
    {
      id: 'blue',
      name: 'blue',
      displayName: 'Ocean Blue',
      isDark: false,
      colors: {
        primary: '#2196f3',
        primaryDark: '#1976d2',
        primaryLight: '#42a5f5',
        secondary: '#03dac6',
        accent: '#ff5722',
        background: '#f5f7fa',
        surface: '#ffffff',
        text: '#263238',
        textSecondary: '#546e7a',
        border: '#e0e7ff',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336'
      }
    },
    {
      id: 'purple',
      name: 'purple',
      displayName: 'Royal Purple',
      isDark: false,
      colors: {
        primary: '#9c27b0',
        primaryDark: '#7b1fa2',
        primaryLight: '#ba68c8',
        secondary: '#e91e63',
        accent: '#ffc107',
        background: '#faf8ff',
        surface: '#ffffff',
        text: '#2d1b69',
        textSecondary: '#5e4037',
        border: '#e8eaf6',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#e91e63'
      }
    },
    {
      id: 'orange',
      name: 'orange',
      displayName: 'Sunset Orange',
      isDark: false,
      colors: {
        primary: '#ff6b35',
        primaryDark: '#e55100',
        primaryLight: '#ff8a65',
        secondary: '#ffc107',
        accent: '#795548',
        background: '#fff8f5',
        surface: '#ffffff',
        text: '#3e2723',
        textSecondary: '#6d4c41',
        border: '#ffe0b2',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336'
      }
    },
    {
      id: 'dark-green',
      name: 'dark-green',
      displayName: 'Dark Forest',
      isDark: true,
      colors: {
        primary: '#6b9b7a',
        primaryDark: '#4a7c59',
        primaryLight: '#8bc34a',
        secondary: '#81c784',
        accent: '#ffb74d',
        background: '#121212',
        surface: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
        border: '#333333',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336'
      }
    },
    {
      id: 'dark-blue',
      name: 'dark-blue',
      displayName: 'Midnight Ocean',
      isDark: true,
      colors: {
        primary: '#42a5f5',
        primaryDark: '#1976d2',
        primaryLight: '#64b5f6',
        secondary: '#26c6da',
        accent: '#ff7043',
        background: '#0d1117',
        surface: '#161b22',
        text: '#f0f6fc',
        textSecondary: '#8b949e',
        border: '#30363d',
        success: '#238636',
        warning: '#d29922',
        error: '#da3633'
      }
    },
    {
      id: 'dark-purple',
      name: 'dark-purple',
      displayName: 'Royal Night',
      isDark: true,
      colors: {
        primary: '#ba68c8',
        primaryDark: '#7b1fa2',
        primaryLight: '#ce93d8',
        secondary: '#f48fb1',
        accent: '#ffcc02',
        background: '#0f0a1a',
        surface: '#1a1625',
        text: '#e8e3f3',
        textSecondary: '#9e8fb2',
        border: '#2d2438',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#e91e63'
      }
    }
  ];

  private currentThemeSubject!: BehaviorSubject<Theme>;
  public currentTheme$!: Observable<Theme>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Initialize the BehaviorSubject after themes array is ready
    this.currentThemeSubject = new BehaviorSubject<Theme>(this.getDefaultTheme());
    this.currentTheme$ = this.currentThemeSubject.asObservable();
    this.loadSavedTheme();
  }

  getThemes(): Theme[] {
    return this.themes;
  }


  getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  // Toggle between light and dark theme
  toggleDarkMode(): void {
    const current = this.getCurrentTheme();
    let nextTheme: Theme | undefined;
    if (current && current.isDark) {
      nextTheme = this.themes.find((t: Theme) => !t.isDark);
    } else {
      nextTheme = this.themes.find((t: Theme) => t.isDark);
    }
    if (nextTheme) {
      this.setTheme(nextTheme.id);
    }
  }

  isDarkTheme(): boolean {
    return this.getCurrentTheme().isDark;
  }

  setTheme(themeId: string): void {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      this.currentThemeSubject.next(theme);
      this.applyTheme(theme);
      this.saveTheme(themeId);
    }
  }

  private getDefaultTheme(): Theme {
    return this.themes[0]; // Green theme as default
  }

  private loadSavedTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedThemeId = localStorage.getItem('selectedTheme');
      if (savedThemeId) {
        const theme = this.themes.find(t => t.id === savedThemeId);
        if (theme) {
          this.currentThemeSubject.next(theme);
          this.applyTheme(theme);
        }
      } else {
        this.applyTheme(this.getDefaultTheme());
      }
    } else {
      // On server, just apply default theme
      this.applyTheme(this.getDefaultTheme());
    }
  }

  private saveTheme(themeId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedTheme', themeId);
    }
  }

  private applyTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      const root = document.documentElement;
      const body = document.body;
      
      if (theme.colors) {
        // Apply CSS custom properties
        root.style.setProperty('--color-primary', theme.colors.primary);
        root.style.setProperty('--color-primary-dark', theme.colors.primaryDark);
        root.style.setProperty('--color-primary-light', theme.colors.primaryLight);
        root.style.setProperty('--color-secondary', theme.colors.secondary);
        root.style.setProperty('--color-accent', theme.colors.accent);
        root.style.setProperty('--color-background', theme.colors.background);
        root.style.setProperty('--color-surface', theme.colors.surface);
        root.style.setProperty('--color-text', theme.colors.text);
        root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
        root.style.setProperty('--color-border', theme.colors.border);
        root.style.setProperty('--color-success', theme.colors.success);
        root.style.setProperty('--color-warning', theme.colors.warning);
        root.style.setProperty('--color-error', theme.colors.error);

        // Apply theme to entire page
        root.style.backgroundColor = theme.colors.background;
        root.style.color = theme.colors.text;
        
        // Update body background and text
        body.style.backgroundColor = theme.colors.background;
        body.style.color = theme.colors.text;
      }
      
      // Add/remove dark theme class for additional styling
      if (theme.isDark) {
        body.classList.add('dark-theme');
        root.classList.add('dark-theme');
      } else {
        body.classList.remove('dark-theme');
        root.classList.remove('dark-theme');
      }
      
      // Set theme attribute for CSS selectors
      root.setAttribute('data-theme', theme.id);
    }
  }
}