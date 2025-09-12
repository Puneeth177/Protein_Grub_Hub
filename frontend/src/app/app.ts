import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { FloatingThemeSwitcherComponent } from './components/theme-switcher/floating-theme-switcher.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, HeaderComponent, FloatingThemeSwitcherComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'Protein Grub Hub';

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    // Initialize theme system
    // Theme service will automatically load saved theme or apply default
  }
}
