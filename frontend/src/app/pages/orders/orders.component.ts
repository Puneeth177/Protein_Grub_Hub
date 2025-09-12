import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
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
    private cartService: CartService
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
    
    // Simulate API call with mock data
    setTimeout(() => {
      this.orders = this.getMockOrders();
      this.isLoading = false;
    }, 1000);
  }

  getMockOrders(): OrderHistory[] {
    return [
      {
        _id: '1',
        orderNumber: 'PGH-2024-001',
        date: new Date('2024-01-15T10:30:00'),
        status: 'delivered',
        items: [
          {
            meal: {
              _id: '1',
              name: 'Grilled Chicken Power Bowl',
              image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
              protein_grams: 45,
              calories: 450,
              price: 12.99
            },
            quantity: 2
          },
          {
            meal: {
              _id: '4',
              name: 'Greek Yogurt Protein Bowl',
              image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
              protein_grams: 20,
              calories: 240,
              price: 7.99
            },
            quantity: 1
          }
        ],
        subtotal: 33.97,
        deliveryFee: 0,
        tax: 2.72,
        total: 36.69,
        deliveryAddress: '123 Main St, City, State 12345',
        estimatedDelivery: new Date('2024-01-15T12:30:00'),
        actualDelivery: new Date('2024-01-15T12:15:00')
      },
      {
        _id: '2',
        orderNumber: 'PGH-2024-002',
        date: new Date('2024-01-18T14:20:00'),
        status: 'out-for-delivery',
        items: [
          {
            meal: {
              _id: '2',
              name: 'Salmon & Sweet Potato',
              image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
              protein_grams: 40,
              calories: 420,
              price: 15.99
            },
            quantity: 1
          }
        ],
        subtotal: 15.99,
        deliveryFee: 5.99,
        tax: 1.28,
        total: 23.26,
        deliveryAddress: '123 Main St, City, State 12345',
        estimatedDelivery: new Date('2024-01-18T16:20:00')
      },
      {
        _id: '3',
        orderNumber: 'PGH-2024-003',
        date: new Date('2024-01-20T09:15:00'),
        status: 'preparing',
        items: [
          {
            meal: {
              _id: '3',
              name: 'Plant-Based Protein Stack',
              image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
              protein_grams: 25,
              calories: 350,
              price: 10.99
            },
            quantity: 3
          }
        ],
        subtotal: 32.97,
        deliveryFee: 5.99,
        tax: 2.64,
        total: 41.60,
        deliveryAddress: '123 Main St, City, State 12345',
        estimatedDelivery: new Date('2024-01-20T11:15:00')
      }
    ];
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