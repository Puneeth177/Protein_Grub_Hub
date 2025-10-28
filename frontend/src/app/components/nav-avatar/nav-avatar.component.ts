import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getInitials } from '../../utils/image';

@Component({
  selector: 'app-nav-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-avatar.component.html',
  styleUrls: ['./nav-avatar.component.css']
})
export class NavAvatarComponent {
  @Input() avatar: { url?: string; id?: string } | null = null;
  @Input() userName: string = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';

  getInitials(name: string): string {
    return getInitials(name).toUpperCase();
  }

  getBackgroundColor(): string {
    if (!this.userName) return '#e0e0e0';
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    return colors[this.userName.charCodeAt(0) % colors.length];
  }
}
