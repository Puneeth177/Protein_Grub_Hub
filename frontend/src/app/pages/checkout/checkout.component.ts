import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { OrderService, CreateOrderRequest } from '../../services/order.service';
import { firstValueFrom } from 'rxjs';
import { DeliveryAddress, CartItem } from '../../models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  readonly taxRate = 0.08; // 8% tax
  readonly baseDeliveryFee = 5.99;
  readonly freeDeliveryThreshold = 50;

  checkoutForm: FormGroup;
  cartItems: CartItem[] = [];
  subtotal = 0;
  tax = 0;
  deliveryFee = 0;
  total = 0;
  
  loading = false;
  error: string | null = null;
  orderComplete = false;
  orderId: string | null = null;

  get addressErrors() {
    const addressForm = this.checkoutForm.get('deliveryAddress');
    return {
      street: this.getFieldError(addressForm, 'street'),
      city: this.getFieldError(addressForm, 'city'),
      state: this.getFieldError(addressForm, 'state'),
      zip_code: this.getFieldError(addressForm, 'zip_code'),
      phone: this.getFieldError(addressForm, 'phone')
    };
  }

  get paymentError() {
    return this.getFieldError(this.checkoutForm, 'paymentMethod');
  }

  constructor(
    private formBuilder: FormBuilder,
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {
    this.checkoutForm = this.formBuilder.group({
      deliveryAddress: this.formBuilder.group({
        street: ['', [Validators.required]],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        zip_code: ['', [Validators.required, Validators.pattern(/^\d{6}(-\d{4})?$/)]],
        phone: ['', [Validators.required, Validators.pattern(/^\+?1?\d{10}$/)]],
        delivery_instructions: ['']
      }),
      paymentMethod: ['card', [Validators.required]]
    });
  }

  async ngOnInit() {
    try {
      // Get cart items and calculate totals
      this.cartItems = await firstValueFrom(this.cartService.cartItems$);
      const cartTotal = await firstValueFrom(this.cartService.cartTotal$);

      if (this.cartItems.length === 0) {
        this.router.navigate(['/cart']);
        return;
      }

      // Calculate order totals
      this.subtotal = cartTotal;
      this.tax = this.subtotal * this.taxRate;
      this.deliveryFee = cartTotal >= this.freeDeliveryThreshold ? 0 : this.baseDeliveryFee;
      this.total = this.subtotal + this.tax + this.deliveryFee;

    } catch (error) {
      this.error = 'Failed to load cart details. Please try again.';
      console.error('Error loading cart:', error);
    }
  }

  private getFieldError(form: any, field: string): string | null {
    const control = form?.get(field);
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return `${field.replace('_', ' ')} is required`;
      if (control.errors['pattern']) {
        if (field === 'zip_code') return 'Please enter a valid ZIP code';
        if (field === 'phone') return 'Please enter a valid phone number';
      }
      return 'Invalid value';
    }
    return null;
  }

  async onSubmit() {
    if (this.checkoutForm.invalid) {
      Object.keys(this.checkoutForm.controls).forEach(key => {
        const control = this.checkoutForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Verify cart has items
      if (this.cartItems.length === 0) {
        this.router.navigate(['/cart']);
        return;
      }

      const formValue = this.checkoutForm.value;
      const orderData: CreateOrderRequest = {
        items: this.cartItems,
        subtotal: this.subtotal,
        tax: this.tax,
        deliveryFee: this.deliveryFee,
        total: this.total,
        deliveryAddress: formValue.deliveryAddress as DeliveryAddress,
        paymentMethod: formValue.paymentMethod
      };

      const order = await firstValueFrom(this.orderService.createOrder(orderData));
      this.orderId = order._id;
      await this.cartService.clearCart();
      this.orderComplete = true;
      // Clear any stored return URLs
      localStorage.removeItem('returnUrl');

    } catch (error: any) {
      console.error('Error creating order:', error);
      
      if (error?.status === 401 || error?.error?.message?.includes('Token')) {
        localStorage.setItem('returnUrl', '/checkout');
        this.router.navigate(['/login']);
      } else {
        this.error = error.error?.message || 'Failed to create order. Please try again.';
      }
    } finally {
      this.loading = false;
    }
  }

  retrySubmit() {
    this.error = null;
    this.onSubmit();
  }
}