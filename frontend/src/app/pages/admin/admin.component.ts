import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { OrderService } from '../../services/order.service';
import { Meal } from '../../models/meal.model';

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
  statusOptions = ['pending','confirmed','preparing','out-for-delivery','delivered','cancelled'];

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

  constructor(private api: ApiService, private ordersApi: OrderService) {}

  ngOnInit(): void {
    this.reload();
  }

  trackById(_index: number, item: any) { return item?._id || _index; }

  reload() {
    this.isLoading = true;
    this.ordersApi.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.api.getMeals().subscribe({
      next: (meals) => { this.products = meals || []; },
      error: () => {}
    });
  }

  // Orders
  updateOrderStatus(orderId: string, status: string) {
    if (!orderId) return;
    this.savingOrderId = orderId;
    this.ordersApi.updateOrderStatus(orderId, status).subscribe({
      next: (o) => {
        const idx = this.orders.findIndex(or => or._id === o._id);
        if (idx > -1) this.orders[idx] = o;
        this.toast('Order status updated', 'success');
        this.savingOrderId = null;
      },
      error: () => { this.toast('Failed to update order', 'error'); this.savingOrderId = null; }
    });
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
