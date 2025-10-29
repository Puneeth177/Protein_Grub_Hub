import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment implements OnInit, OnDestroy {
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  cardElement: StripeCardElement | null = null;

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

  // UPI Details from environment
  merchantUpiId: string = '8904977307@ybl';
  merchantName: string = 'Protein Grub Hub';
  upiQrCodeUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    // Get order ID from route
    this.orderId = this.route.snapshot.paramMap.get('orderId') || '';

    if (!this.orderId) {
      this.errorMessage = 'Order ID not found';
      return;
    }

    // Load order details
    await this.loadOrderDetails();

    // Initialize Stripe
    await this.initializeStripe();
  }

  async loadOrderDetails() {
    try {
      this.isLoading = true;
      // Fetch order details from API
      this.orderDetails = await this.apiService.getOrder(this.orderId).toPromise();
      
      if (this.orderDetails.status === 'paid') {
        this.router.navigate(['/orders', this.orderId]);
        return;
      }

      // Create payment intent
      await this.createPaymentIntent();
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Failed to load order details';
    } finally {
      this.isLoading = false;
    }
  }

  async createPaymentIntent() {
    try {
      const response: any = await this.apiService.createPaymentIntent({
        orderId: this.orderId,
        amount: this.orderDetails.total || this.orderDetails.totalAmount,
        currency: 'INR',
        paymentMethod: this.selectedPaymentMethod
      }).toPromise();

      this.clientSecret = response.clientSecret;
      this.paymentIntentId = response.paymentIntentId;
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Failed to initialize payment';
      throw error;
    }
  }

  async initializeStripe() {
    try {
      // Load Stripe with publishable key
      this.stripe = await loadStripe(environment.stripePublishableKey);

      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Create Elements instance
      this.elements = this.stripe.elements();

      // Create and mount card element
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#32325d',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });

      // Mount card element to DOM
      setTimeout(() => {
        if (this.cardElement) {
          this.cardElement.mount('#card-element');
        }
      }, 100);

    } catch (error) {
      console.error('Stripe initialization error:', error);
      this.errorMessage = 'Failed to initialize payment system';
    }
  }

  selectPaymentMethod(method: 'card' | 'upi') {
    this.selectedPaymentMethod = method;
    this.errorMessage = '';
    
    if (method === 'upi') {
      this.showUpiQr = true;
      this.generateUpiQrCode();
    }
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
    if (!this.stripe || !this.cardElement || !this.clientSecret) {
      this.errorMessage = 'Payment system not ready';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      console.log('Confirming card payment...');
      
      // Confirm card payment
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        this.clientSecret,
        {
          payment_method: {
            card: this.cardElement
          }
        }
      );

      if (error) {
        console.error('Payment error:', error);
        this.errorMessage = error.message || 'Payment failed';
        this.isProcessing = false;
        return;
      }

      console.log('Payment Intent:', paymentIntent);

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        this.successMessage = '✅ Payment Successful! Redirecting to your orders...';
        console.log('Payment succeeded, redirecting...');
        
        // Wait 2 seconds then redirect
        setTimeout(() => {
          this.router.navigate(['/orders']);
        }, 2000);
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        this.errorMessage = 'Additional authentication required. Please complete the verification.';
      } else {
        this.errorMessage = 'Payment status: ' + (paymentIntent?.status || 'unknown');
      }

    } catch (error: any) {
      console.error('Payment processing error:', error);
      this.errorMessage = error.message || 'Payment processing failed';
    } finally {
      this.isProcessing = false;
    }
  }

  async handleUpiPayment() {
    // For UPI, show QR code and instructions
    this.showUpiQr = true;
    this.errorMessage = 'Scan the QR code with any UPI app to complete payment';
  }

  async submitPayment() {
    if (this.selectedPaymentMethod === 'card') {
      await this.handleCardPayment();
    } else {
      await this.handleUpiPayment();
    }
  }

  ngOnDestroy() {
    // Cleanup
    if (this.cardElement) {
      this.cardElement.destroy();
    }
  }
}
