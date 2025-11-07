import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, CartItem, DeliveryAddress } from '../models/order.model';

export interface CreateOrderRequest {
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: DeliveryAddress;
  paymentMethod: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = (environment.apiUrl || '').replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): { [key: string]: string } {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    return {};
  }

  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    // Skip during SSR
    if (typeof window === 'undefined') {
      return new Observable();
    }

    return this.http.post<Order>(`${this.apiUrl}/orders`, orderData, { 
      headers: this.getAuthHeaders() 
    });
  }

  getOrders(): Observable<Order[]> {
    // Skip during SSR
    if (typeof window === 'undefined') {
      return new Observable<Order[]>();
    }

    return this.http.get<Order[]>(`${this.apiUrl}/orders`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getOrderById(orderId: string): Observable<Order> {
    // Skip during SSR
    if (typeof window === 'undefined') {
      return new Observable<Order>();
    }

    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Admin: update order status
  updateOrderStatus(orderId: string, status: string): Observable<any> {
    if (!orderId) throw new Error('orderId required');
    return this.http.put<any>(
      `${this.apiUrl}/orders/${orderId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }
}