// order-tracking.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DeliveryMapComponent } from '../../components/delivery-map/delivery-map.component';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule, DeliveryMapComponent],
  template: `
    <div class="order-tracking-container">
      <h1>Track Your Order</h1>
      <div class="order-details">
        <p>Order #12345 • Estimated delivery: 30-40 min</p>
      </div>
      <app-delivery-map></app-delivery-map>
      <div class="actions">
        <button routerLink="/orders" class="btn btn-outline">Back to Orders</button>
        <button routerLink="/" class="btn btn-primary">Continue Shopping</button>
      </div>
    </div>
  `,
  styles: [`
    .order-tracking-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    h1 {
      margin-bottom: 10px;
      color: #333;
    }
    
    .order-details {
      margin-bottom: 20px;
      color: #666;
    }
    
    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      text-align: center;
    }
    
    .btn-outline {
      border: 1px solid #ddd;
      background: #fff;
      color: #333;
    }
    
    .btn-primary {
      background: #1976d2;
      color: white;
      border: none;
    }
  `]
})
export class OrderTrackingComponent {}