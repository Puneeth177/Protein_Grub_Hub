import { Component } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floating-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-theme-switcher.component.html',
  styleUrls: ['./floating-theme-switcher.component.css']
})
export class FloatingThemeSwitcherComponent {
  constructor(public themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  isDark(): boolean {
    return this.themeService.getCurrentTheme().isDark;
  }
}
