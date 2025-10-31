import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

import { OrderHistory } from '../../models/order-history.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  currentUser: any = null;
  orders: OrderHistory[] = [];
  isLoading = true;
  selectedOrder: OrderHistory | null = null;
  filterStatus: string = 'all';

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private orderService: OrderService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadOrders();
      }
    });
  }

  loadOrders() {
    this.isLoading = true;
    this.orderService.getOrders().subscribe({
      next: (orders: any[]) => {
        // Backend returns array of orders; assign directly. If template expects OrderHistory, keep fields compatible.
        this.orders = (orders || []).map(o => ({
          _id: o._id,
          orderNumber: o._id,
          date: new Date(o.created || o.createdAt || o.updatedAt || Date.now()),
          status: o.status || 'pending',
          items: o.items || [],
          subtotal: o.subtotal || 0,
          deliveryFee: o.deliveryFee || 0,
          tax: o.tax || 0,
          total: o.total || o.totalAmount || 0,
          deliveryAddress: (o.delivery && (o.delivery.street || o.delivery.address)) || '',
          estimatedDelivery: o.estimatedDelivery || null,
          actualDelivery: o.actualDelivery || null
        })) as any;
        this.isLoading = false;

        // If an :orderId param is present, auto-open that order
        const targetId = this.route.snapshot.paramMap.get('orderId');
        if (targetId) {
          const match = this.orders.find(or => String(or._id) === String(targetId));
          if (match) {
            this.selectedOrder = match as any;
          }
        }
      },
      error: (err) => {
        console.error('Failed to load orders', err);
        this.isLoading = false;
      }
    });
  }

  getFilteredOrders(): OrderHistory[] {
    if (this.filterStatus === 'all') {
      return this.orders;
    }
    return this.orders.filter(order => order.status === this.filterStatus);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': '#f39c12',
      'confirmed': '#3498db',
      'preparing': '#e67e22',
      'out-for-delivery': '#9b59b6',
      'delivered': '#27ae60',
      'cancelled': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'out-for-delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return texts[status] || status;
  }

  viewOrderDetails(order: OrderHistory) {
    this.selectedOrder = order;
  }

  closeOrderDetails() {
    this.selectedOrder = null;
  }

  reorderItems(order: OrderHistory) {
    // Add all items from the order to cart
    order.items.forEach(item => {
      this.cartService.addToCart(
        {
          _id: item.meal._id,
          name: item.meal.name,
          description: '',
          protein_grams: item.meal.protein_grams,
          carbs_grams: 0,
          fat_grams: 0,
          calories: item.meal.calories,
          price: item.meal.price,
          image_url: item.meal.image_url,
          dietary_tags: []
        },
        item.quantity
      );
    });
    
    // Show success message or navigate to cart
    alert(`${order.items.length} items added to cart!`);
  }

  trackOrder(order: OrderHistory) {
    // In a real app, this would open a tracking modal or navigate to tracking page
    alert(`Tracking order ${order.orderNumber}. Current status: ${this.getStatusText(order.status)}`);
  }

  getTotalProtein(order: OrderHistory): number {
    return order.items.reduce((total, item) => total + (item.meal.protein_grams * item.quantity), 0);
  }

  getTotalCalories(order: OrderHistory): number {
    return order.items.reduce((total, item) => total + (item.meal.calories * item.quantity), 0);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}