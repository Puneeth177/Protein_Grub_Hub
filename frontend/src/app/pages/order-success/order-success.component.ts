import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css']
})
export class OrderSuccessComponent implements OnInit {
  orderId = '';
  order: any = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cartService: CartService
  ) {}

  async ngOnInit() {
    // Ensure cart reflects cleared state after successful order
    try { this.cartService.refreshFromServer(); } catch {}
    this.orderId = this.route.snapshot.paramMap.get('orderId') || '';
    if (!this.orderId) {
      this.error = 'Order ID not found';
      this.loading = false;
      return;
    }
    try {
      this.order = await firstValueFrom(this.api.getOrder(this.orderId));
    } catch (e: any) {
      this.error = e?.error?.message || 'Unable to load order details';
    } finally {
      this.loading = false;
    }
  }

  viewOrders() {
    this.router.navigate(['/orders', this.orderId]);
  }

  continueShopping() {
    this.router.navigate(['/meals']);
  }
}
