import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';

declare const Razorpay: any;

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment implements OnInit, OnDestroy {
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  paymentElementMounted = false;
  private paymentElementRef: any = null;

  orderId: string = '';
  orderDetails: any = null;
  clientSecret: string = '';
  paymentIntentId: string = '';

  isLoading: boolean = false;
  isProcessing: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  selectedPaymentMethod: 'card' | 'upi' = 'card';
  showUpiQr: boolean = false;
  vpa: string = '';

  // UPI Details from environment
  merchantUpiId: string = '8904977307@ybl';
  merchantName: string = 'Protein Grub Hub';
  upiQrCodeUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private cartService: CartService
  ) {}

  async ngOnInit() {
    try {
      // Get order ID from route
      this.orderId = this.route.snapshot.paramMap.get('orderId') || '';

      if (!this.orderId) {
        this.errorMessage = 'Order ID not found';
        return;
      }

      // Load order details
      await this.loadOrderDetails();

    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to initialize payment page';
    }
  }

  async loadOrderDetails() {
    try {
      this.isLoading = true;
      // Fetch order details from API
      this.orderDetails = await firstValueFrom(this.apiService.getOrder(this.orderId));
      
      if (this.orderDetails.status === 'completed') {
        this.router.navigate(['/orders', this.orderId]);
        return;
      }

      // Razorpay flow does not require a Stripe PaymentIntent
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Failed to load order details';
    } finally {
      this.isLoading = false;
    }
  }

  // No Stripe create-intent in Razorpay flow

  async initializeStripe() {
    // Not required for Razorpay flow; no-op
    return;
  }

  async selectPaymentMethod(method: 'card' | 'upi') {
    this.selectedPaymentMethod = method;
    this.errorMessage = '';
    
    if (method === 'upi') {
      this.showUpiQr = false;
    }

    // No-op for Razorpay: method selection happens inside Razorpay modal
  }

  generateUpiQrCode() {
    if (!this.orderDetails || !this.orderDetails.total) {
      return;
    }

    const amount = this.orderDetails.total || this.orderDetails.totalAmount;
    const transactionNote = `Order ${this.orderId}`;
    
    // UPI Payment URL format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&tn=<NOTE>&cu=INR
    const upiUrl = `upi://pay?pa=${this.merchantUpiId}&pn=${encodeURIComponent(this.merchantName)}&am=${amount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;
    
    // Generate QR code using QR Server API (more reliable than Google Charts)
    const qrSize = 250;
    this.upiQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(upiUrl)}`;
    
    console.log('UPI QR Code URL:', this.upiQrCodeUrl);
    console.log('UPI Payment URL:', upiUrl);
  }

  async handleCardPayment() {
    // With Payment Element, card flow uses the same confirmPayment call.
    await this.submitPayment();
  }

  async handleUpiPayment() {
    if (!this.stripe || !this.clientSecret) {
      this.errorMessage = 'Payment system not ready';
      return;
    }
    if (!this.vpa || !/^[\w.-]+@[\w.-]+$/.test(this.vpa)) {
      this.errorMessage = 'Enter a valid UPI ID (e.g., name@upi)';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.errorMessage = 'UPI is not available in this build. Please use Card.';
      this.isProcessing = false;
      return;

    } catch (error: any) {
      this.errorMessage = error.message || 'Payment processing failed';
    } finally {
      this.isProcessing = false;
    }
  }

  async submitPayment() {
    if (this.isProcessing) {
      console.log('[Payment] Ignoring click while processing');
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.isProcessing = true;
    console.log('[Payment] Pay button clicked');

    try {
      if (!this.orderDetails) {
        this.errorMessage = 'Order not found';
        this.isProcessing = false;
        return;
      }
      if (typeof Razorpay === 'undefined') {
        console.error('[Payment] Razorpay script not loaded');
        this.errorMessage = 'Payment system not ready (Razorpay script not loaded). Please hard refresh the page (Ctrl+Shift+R).';
        this.isProcessing = false;
        return;
      }

      const total = this.orderDetails.total || this.orderDetails.totalAmount;
      console.log('[Payment] Creating Razorpay order...', { orderId: this.orderId, total });
      const resp = await firstValueFrom(this.apiService.createRazorpayOrder({
        orderId: this.orderId,
        amount: total,
        currency: 'INR'
      }));

      console.log('[Payment] Razorpay order created', resp);

      const options: any = {
        key: resp.keyId,
        amount: resp.amount, // in paise
        currency: resp.currency,
        name: 'Protein Grub Hub',
        description: `Order #${this.orderId}`,
        order_id: resp.rzpOrderId,
        theme: { color: '#0ea5e9' },
        modal: {
          ondismiss: () => {
            console.log('[Payment] Razorpay modal dismissed by user');
            this.errorMessage = 'Payment was cancelled before completion. You have not been charged.';
            this.successMessage = '';
            this.isProcessing = false;
          }
        },
        handler: async (successResp: any) => {
          this.successMessage = 'Payment initiated. Finalizing your order...';
          // Try client-side verification (fallback if webhook can’t reach local server)
          try {
            if (successResp?.razorpay_order_id && successResp?.razorpay_payment_id && successResp?.razorpay_signature) {
              await firstValueFrom(this.apiService.verifyRazorpayPayment({
                razorpay_order_id: successResp.razorpay_order_id,
                razorpay_payment_id: successResp.razorpay_payment_id,
                razorpay_signature: successResp.razorpay_signature
              }));
              // Refresh cart from server after successful verification
              this.cartService.refreshFromServer();
            }
          } catch (e) {
            // ignore; webhook/polling will still complete order
          }
          await this.pollOrderCompletion();
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (err: any) => {
        const code = err?.error?.code || 'FAILED';
        const desc = err?.error?.description || 'Payment failed';
        this.errorMessage = `Payment ${code}: ${desc}. Please try again.`;
        this.successMessage = '';
        this.isProcessing = false;
      });
      // When user closes the Razorpay modal without paying
      rzp.on('modal.closed', () => {
        this.errorMessage = 'Payment was cancelled before completion. You have not been charged.';
        this.successMessage = '';
        this.isProcessing = false;
      });
      console.log('[Payment] Opening Razorpay modal');
      rzp.open();

    } catch (error: any) {
      this.errorMessage = error?.message || 'Failed to start payment';
      console.error('[Payment] submitPayment error', error);
      this.isProcessing = false;
    }
  }

  private async pollOrderCompletion(maxWaitMs: number = 20000, intervalMs: number = 2000) {
    const start = Date.now();
    try {
      while (Date.now() - start < maxWaitMs) {
        const order = await firstValueFrom(this.apiService.getOrder(this.orderId));
        if (order?.status === 'completed') {
          // Ensure cart reflects server-cleared state
          this.cartService.refreshFromServer();
          this.successMessage = '✅ Payment Successful! Redirecting to confirmation...';
          setTimeout(() => this.router.navigate(['/order-success', this.orderId]), 1000);
          return;
        }
        await new Promise(r => setTimeout(r, intervalMs));
      }
      this.errorMessage = 'Payment is processing. Please check Orders shortly.';
    } catch (e) {
      this.errorMessage = 'Unable to verify payment status. Please check Orders.';
    } finally {
      this.isProcessing = false;
    }
  }

  ngOnDestroy() {
    // Cleanup
    // Payment Element is auto-cleaned up with DOM removal
  }
}
