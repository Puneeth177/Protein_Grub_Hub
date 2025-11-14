import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { OrderService } from '../../services/order.service';
import { Meal } from '../../models/meal.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  orders: any[] = [];
  products: Meal[] = [];
  isLoading = true;
  error = '';
  // Order status options - must match backend's enum
  statusOptions = [
    'pending',
    'processing',
    'completed',  // This is used instead of 'delivered' in the backend
    'cancelled',
    'out-for-delivery',
    'delivered'   // This is used instead of 'completed' in the frontend
  ];
  
  // Map frontend status to backend status if needed
  private mapToBackendStatus(status: string): string {
    const statusMap: {[key: string]: string} = {
      // Add any mappings if needed between frontend and backend statuses
    };
    return statusMap[status] || status;
  }

  // UI state
  toasts: { id: number; text: string; type: 'success'|'error'|'info' }[] = [];
  private toastSeq = 0;
  savingOrderId: string | null = null;
  savingProductId: string | null = null;
  creating = false;

  // Filters/search/pagination
  orderQuery = '';
  productQuery = '';
  orderPage = 1;
  productPage = 1;
  pageSize = 8;

  // New product form
  newProduct: any = {
    name: '',
    desc: '',
    category: 'Meals',
    price: 0,
    protein: 0,
    calories: 0,
    carbs: 0,
    fat: 0,
    inventory: 0,
    image_url: '',
    dietary_tags: [] as string[],
  };

  constructor(private api: ApiService, private orderService: OrderService, private http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    await this.loadUndeliveredOrders();
    this.loadProducts();
  }

  trackById(_index: number, item: any) { return item?._id || _index; }

  async loadUndeliveredOrders(): Promise<any[]> {
    this.isLoading = true;
    this.error = '';
    try {
      console.log('Fetching undelivered orders...');
      const url = `${environment.apiUrl}/orders/admin/undelivered`;
      console.log('API URL:', url);
      
      const orders = await this.http.get<any[]>(url, { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }).toPromise();
      
      if (!orders) {
        throw new Error('No orders returned from server');
      }
      
      this.orders = orders;
      console.log('Successfully loaded undelivered orders:', this.orders);
      return orders;
      
      if (this.orders.length === 0) {
        this.toast('No undelivered orders found', 'info');
      }
    } catch (err: any) {
      console.error('Error loading undelivered orders:', err);
      const errorMessage = err.error?.message || 
                         err.message || 
                         'Failed to load undelivered orders. Please try again.';
      
      this.error = errorMessage;
      this.toast(errorMessage, 'error');
      
      // If it's an authentication error, suggest logging in again
      if (err.status === 401 || err.status === 403) {
        this.toast('Please log in as an admin to view orders', 'error');
      }
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  loadProducts() {
    this.api.getMeals().subscribe({
      next: (meals) => { this.products = meals || []; },
      error: () => {}
    });
  }

  // Handle status change from dropdown
  onStatusChange(order: any, newStatus: string) {
    console.log('Status change detected:', {
      orderId: order._id,
      currentStatus: order.status,
      newStatus: newStatus,
      statusChanged: order.status !== newStatus
    });
    
    if (order.status === newStatus) {
      console.log('Status not changed, skipping update');
      return;
    }
    
    // Don't update the order status yet - wait for the backend to confirm
    this.updateOrderStatus(order, newStatus);
  }

  // Update order status
  async updateOrderStatus(order: any, status: string) {
    // Map to backend status if needed
    const backendStatus = this.mapToBackendStatus(status);
    const orderId = order._id;
    
    console.log('Starting updateOrderStatus with:', {
      orderId,
      currentStatus: order.status,
      newStatus: status,
      backendStatus
    });
    
    if (!orderId) {
      console.error('Invalid order object or missing _id:', order);
      this.toast('Invalid order data', 'error');
      return;
    }
    
    if (order.status === status) {
      console.warn('Order status is already', status, 'for order:', orderId);
      return;
    }
    
    this.savingOrderId = order._id;
    const originalStatus = order.status;
    
    try {
      const url = `${environment.apiUrl}/orders/${order._id}/status`;
      console.log('Updating order status:', { 
        orderId: order._id, 
        fromStatus: order.status, 
        toStatus: status,
        url 
      });
      
      const response = await this.http.put<any>(
        url, 
        JSON.stringify({ status: backendStatus }), // Use mapped status
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      ).toPromise();
      
      console.log('Update response:', response);
      
      if (!response || !response._id) {
        throw new Error('No response from server');
      }
      
      // Update the order in the local array with the response data
      const orderIndex = this.orders.findIndex(o => o._id === order._id);
      if (orderIndex !== -1) {
        this.orders[orderIndex] = response;
      }
      
      // Reload orders to ensure we have the latest data
      await this.loadUndeliveredOrders();
      
      this.toast(`Order ${order.orderNumber || order._id} updated to ${status}`, 'success');
    } catch (err: any) {
      console.error('Error updating order status:', err);
      
      // Revert the status in the UI on error
      order.status = originalStatus;
      
      let errorMessage = 'Failed to update order status';
      if (err.status === 404) {
        errorMessage = 'Order not found. Please refresh the page.';
      } else if (err.status === 401 || err.status === 403) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      this.toast(errorMessage, 'error');
    } finally {
      this.savingOrderId = null;
    }
  }

  reload() {
    this.loadUndeliveredOrders();
  }

  // Inventory
  updateStock(product: Meal, value: number) {
    const inv = Number(value);
    if (!Number.isFinite(inv)) return;
    this.savingProductId = product._id;
    this.api.updateProduct(product._id, { inventory: inv }).subscribe({
      next: (p) => {
        const idx = this.products.findIndex(m => m._id === p._id);
        if (idx > -1) this.products[idx].inventory = inv;
        this.toast('Stock updated', 'success');
        this.savingProductId = null;
      },
      error: () => { this.toast('Failed to update stock', 'error'); this.savingProductId = null; }
    });
  }

  // Products CRUD
  createProduct() {
    const payload = { ...this.newProduct };
    this.creating = true;
    this.api.createProduct(payload).subscribe({
      next: (p) => {
        // Map to Meal shape for local list
        this.api.getMealById(p._id).subscribe({
          next: (meal) => {
            this.products.unshift(meal);
            this.resetNew();
            this.toast('Product created', 'success');
            this.creating = false;
          },
          error: () => { this.resetNew(); this.creating = false; }
        });
      },
      error: () => { this.toast('Failed to create product', 'error'); this.creating = false; }
    });
  }

  deleteProduct(id: string) {
    if (!id) return;
    if (!confirm('Delete this product?')) return;
    this.api.deleteProduct(id).subscribe({
      next: () => { this.products = this.products.filter(p => p._id !== id); },
      error: () => { this.toast('Failed to delete product', 'error'); }
    });
  }

  private resetNew() {
    this.newProduct = {
      name: '', desc: '', category: 'Meals', price: 0,
      protein: 0, calories: 0, carbs: 0, fat: 0, inventory: 0, image_url: '', dietary_tags: []
    };
  }

  // Image upload → data URL
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.newProduct.image_url = String(reader.result || '');
      this.toast('Image loaded', 'info');
    };
    reader.readAsDataURL(file);
  }

  // Dietary tags management
  addTagInput = '';
  addTag() {
    const t = (this.addTagInput || '').trim();
    if (!t) return;
    if (!Array.isArray(this.newProduct.dietary_tags)) this.newProduct.dietary_tags = [];
    if (!this.newProduct.dietary_tags.includes(t)) this.newProduct.dietary_tags.push(t);
    this.addTagInput = '';
  }
  removeTag(tag: string) {
    if (!Array.isArray(this.newProduct.dietary_tags)) return;
    this.newProduct.dietary_tags = this.newProduct.dietary_tags.filter((t: string) => t !== tag);
  }

  // Derived lists with search + pagination
  get filteredOrders() {
    const q = this.orderQuery.toLowerCase();
    const list = q
      ? this.orders.filter(o => String(o._id).toLowerCase().includes(q) || String(o.status||'').toLowerCase().includes(q))
      : this.orders;
    const start = (this.orderPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }
  get filteredProducts() {
    const q = this.productQuery.toLowerCase();
    const list = q
      ? this.products.filter(p => p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q))
      : this.products;
    const start = (this.productPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  // Pagination helpers (avoid Math in templates)
  orderTotalPages(): number {
    const q = this.orderQuery.toLowerCase();
    const list = q
      ? this.orders.filter(o => String(o._id).toLowerCase().includes(q) || String(o.status||'').toLowerCase().includes(q))
      : this.orders;
    return Math.max(1, Math.ceil(list.length / this.pageSize));
  }
  productTotalPages(): number {
    const q = this.productQuery.toLowerCase();
    const list = q
      ? this.products.filter(p => p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q))
      : this.products;
    return Math.max(1, Math.ceil(list.length / this.pageSize));
  }
  prevOrderPage() { this.orderPage = Math.max(1, this.orderPage - 1); }
  nextOrderPage() { this.orderPage = Math.min(this.orderTotalPages(), this.orderPage + 1); }
  prevProductPage() { this.productPage = Math.max(1, this.productPage - 1); }
  nextProductPage() { this.productPage = Math.min(this.productTotalPages(), this.productPage + 1); }

  // Toasts
  private toast(text: string, type: 'success'|'error'|'info' = 'info') {
    const id = ++this.toastSeq;
    this.toasts.push({ id, text, type });
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 2500);
  }
}
