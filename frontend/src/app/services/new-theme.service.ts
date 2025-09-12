import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Theme {
  id: string;
  name: string;
  displayName: string;
  isDark: boolean;
}

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
    }
  ];

  private currentThemeSubject: BehaviorSubject<Theme>;
  public currentTheme$: Observable<Theme>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const savedTheme = this.getSavedTheme();
    this.currentThemeSubject = new BehaviorSubject<Theme>(savedTheme || this.themes[0]);
    this.currentTheme$ = this.currentThemeSubject.asObservable();
    this.applyTheme(this.currentThemeSubject.value);
  }

  private getSavedTheme(): Theme | null {
    if (isPlatformBrowser(this.platformId)) {
      const savedThemeId = localStorage.getItem('theme');
      if (savedThemeId) {
        return this.themes.find(t => t.id === savedThemeId) || null;
      }
    }
    return null;
  }

  private saveTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('theme', theme.id);
    }
  }

  private applyTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      const root = document.documentElement;

      // Remove all existing theme classes
      this.themes.forEach(t => {
        root.classList.remove(t.name + '-theme');
      });

      // Add new theme class
      root.classList.add(theme.name + '-theme');

      // Apply dark mode class
      if (theme.isDark) {
        root.classList.add('dark-theme');
      } else {
        root.classList.remove('dark-theme');
      }
    }
  }

  public getThemes(): Theme[] {
    return this.themes;
  }

  public getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  public setTheme(theme: Theme): void {
    this.saveTheme(theme);
    this.applyTheme(theme);
    this.currentThemeSubject.next(theme);
  }
}
