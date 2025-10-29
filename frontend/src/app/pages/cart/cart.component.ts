import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cartItems$: Observable<any[]>;
  cartTotal$: Observable<number>;
  cartItemCount$: Observable<number>;
  
  deliveryFee = 49;
  freeDeliveryThreshold = 500;
  taxRate = 0.05; // 5% GST

  constructor(private cartService: CartService) {
    this.cartItems$ = this.cartService.cartItems$;
    this.cartTotal$ = this.cartService.cartTotal$;
    this.cartItemCount$ = this.cartService.cartItemCount$;
  }

  ngOnInit() {}

  updateQuantity(itemId: string, quantity: number, mealName?: string) {
    if (quantity <= 0) {
      this.removeItem(itemId, mealName);
    } else {
      this.cartService.updateQuantity(itemId, quantity, undefined, mealName);
    }
  }

  removeItem(itemId: string, mealName?: string) {
    this.cartService.removeFromCart(itemId, undefined, mealName);
  }

  clearCart() {
    this.cartService.clearCart();
  }

  getSubtotal(cartTotal: number): number {
    return cartTotal;
  }

  getDeliveryFee(cartTotal: number): number {
    return cartTotal >= this.freeDeliveryThreshold ? 0 : this.deliveryFee;
  }

  getTax(cartTotal: number): number {
    return cartTotal * this.taxRate;
  }

  getFinalTotal(cartTotal: number): number {
    const subtotal = this.getSubtotal(cartTotal);
    const delivery = this.getDeliveryFee(cartTotal);
    const tax = this.getTax(cartTotal);
    return subtotal + delivery + tax;
  }

  getRemainingForFreeDelivery(cartTotal: number): number {
    return Math.max(this.freeDeliveryThreshold - cartTotal, 0);
  }

  isEligibleForFreeDelivery(cartTotal: number): boolean {
    return cartTotal >= this.freeDeliveryThreshold;
  }

  getTotalProtein(cartItems: any[]): number {
    return cartItems.reduce((total, item) => total + (((item?.meal?.protein_grams) ?? 0) * (item?.quantity ?? 0)), 0);
  }

  getTotalCalories(cartItems: any[]): number {
    return cartItems.reduce((total, item) => total + (((item?.meal?.calories) ?? 0) * (item?.quantity ?? 0)), 0);
  }

  trackByItem(index: number, item: any) {
    return item?.meal?._id || item?.meal?.name || index;
  }
}