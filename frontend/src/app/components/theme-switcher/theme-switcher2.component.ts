import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-switcher2',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="theme-switcher">
      <select 
        class="theme-select"
        [value]="currentTheme.id"
        (change)="onThemeChange($event)"
      >
        <option value="forest-green">Forest Green (Light)</option>
        <option value="dark-forest">Dark Forest</option>
      </select>
    </div>
  `,
  styles: [`
    .theme-switcher {
      position: relative;
      display: inline-block;
    }

    .theme-select {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--light-border);
      background: var(--light-surface);
      color: var(--light-text);
      cursor: pointer;
      font-size: 14px;
      min-width: 200px;
      transition: all 0.3s ease;
    }

    :host-context(.dark-theme) .theme-select {
      background: var(--dark-surface);
      color: var(--dark-text);
      border-color: var(--dark-border);
    }
  `]
})
export class ThemeSwitcherComponent2 implements OnInit {
  currentTheme: Theme;

  constructor(private themeService: ThemeService) {
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  ngOnInit() {
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  onThemeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select) {
      this.themeService.setTheme(select.value);
    }
  }
}
