import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.css']
})
export class ThemeSwitcherComponent implements OnInit {
  currentTheme: Theme;
  isOpen: boolean = false;

  constructor(private themeService: ThemeService) {
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  ngOnInit() {
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectTheme(event: Event) {
    const select = event.target as HTMLSelectElement;
    const themeId = select.value;
    this.themeService.setTheme(themeId);
    this.isOpen = false;
  }

  closeDropdown() {
    this.isOpen = false;
  }
}