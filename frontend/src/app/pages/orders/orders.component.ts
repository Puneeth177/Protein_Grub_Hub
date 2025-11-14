import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ReviewService } from '../../services/review.service';
import { OrderReviewFormComponent } from '../../components/order-review-form/order-review-form.component';
import { Subscription } from 'rxjs';

interface Meal {
  _id: string;
  name: string;
  price: number;
  protein_grams?: number;
  calories?: number;
  image_url?: string;
}

interface OrderItem {
  _id: string;
  meal: Meal;
  quantity: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  date: Date | string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress?: string;
  estimatedDelivery?: Date | string | null;
  actualDelivery?: Date | string | null;
}

interface Review {
  _id?: string;
  rating: number;
  comment: string;
  date?: Date | string;
  mealId?: string;
  orderId?: string;
  mealName?: string;
  createdAt?: Date | string;
  author?: {
    userId: string;
    name: string;
    avatarUrl?: string;
  };
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, OrderReviewFormComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  currentUser: any;
  selectedOrder: Order | null = null;
  filteredOrders: Order[] = [];
  filterStatus: string = 'all';
  isLoading: boolean = false;

  orderReviews: { [orderId: string]: Review } = {};
  showReviewForm: { [key: string]: boolean } = {};
  reviewLoading: { [key: string]: boolean } = {};
  private _showLoginPrompt = false;
  private reviewsSub?: Subscription;

  get showLoginPrompt(): boolean {
    return this._showLoginPrompt;
  }

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private reviewService: ReviewService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadOrders();
        this.loadUserReviews();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.reviewsSub) {
      this.reviewsSub.unsubscribe();
    }
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'out-for-delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalProtein(order: Order): number {
    if (!order?.items) return 0;
    return order.items.reduce((total, item) => {
      return total + ((item.meal?.protein_grams || 0) * (item.quantity || 1));
    }, 0);
  }

  getTotalCalories(order: Order): number {
    if (!order?.items) return 0;
    return order.items.reduce((total, item) => {
      return total + ((item.meal?.calories || 0) * (item.quantity || 1));
    }, 0);
  }

  getFirstMealId(order: Order): string {
    return order?.items?.[0]?.meal?._id || '';
  }

  getFirstMealName(order: Order): string {
    return order?.items?.[0]?.meal?.name || 'this meal';
  }

  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
    this.loadUserReviews();
  }

  closeOrderDetails(): void {
    this.selectedOrder = null;
  }

  toggleReviewForm(orderId: string): void {
    this.showReviewForm[orderId] = !this.showReviewForm[orderId];
  }

  trackOrder(order: Order): void {
    console.log('Tracking order:', order._id);
    this.router.navigate(['/track-order', order._id]);
  }

  reorderItems(order: Order): void {
    console.log('Reordering items from order:', order._id);
    // Implement reorder logic here
    this.snackBar.open('Items added to cart', 'View Cart', {
      duration: 3000
    }).onAction().subscribe(() => {
      this.router.navigate(['/cart']);
    });
  }

  applyFilter(): void {
    if (this.filterStatus === 'all') {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(order => order.status === this.filterStatus);
    }
  }

  private updateFilteredOrders(): void {
    this.applyFilter();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.orderService.getOrders().subscribe({
      next: (orders: any[]) => {
        this.orders = (orders || []).map(o => ({
          _id: o._id,
          orderNumber: o._id,
          date: new Date(o.created || o.createdAt || o.updatedAt || Date()),
          status: o.status || 'pending',
          items: o.items || [],
          subtotal: o.subtotal || 0,
          deliveryFee: o.deliveryFee || 0,
          tax: o.tax || 0,
          total: o.total || 0,
          deliveryAddress: o.deliveryAddress || '',
          estimatedDelivery: o.estimatedDelivery ? new Date(o.estimatedDelivery) : null,
          actualDelivery: o.actualDelivery ? new Date(o.actualDelivery) : null
        }));
        this.updateFilteredOrders();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.isLoading = false;
        this.snackBar.open('Failed to load orders', 'Retry', {
          duration: 5000
        }).onAction().subscribe(() => this.loadOrders());
      }
    });
  }

  loadUserReviews(): void {
    if (!this.currentUser?.id && !this.currentUser?._id) {
      console.log('No authenticated user, skipping reviews load');
      this.showLoginMessage();
      return;
    }

    // Trigger a fresh fetch of the current user's reviews from the backend
    this.reviewService.getCurrentUserReviews().subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error preloading user reviews:', err);
      }
    });

    // Keep orders page in sync with any changes to reviews (add/delete from profile, etc.)
    if (this.reviewsSub) {
      this.reviewsSub.unsubscribe();
    }

    this.reviewsSub = this.reviewService.reviews.subscribe((reviews: Review[] ) => {
      this.orderReviews = {};

      const userId = this.currentUser?._id || this.currentUser?.id;

      (reviews || []).forEach(review => {
        // Only consider this user's reviews when author info is present
        if (review.author && userId && review.author.userId !== userId) {
          return;
        }

        const mealId = review.mealId || (review as any).productId;
        if (!mealId) return;

        // Find the order that contains this meal
        const orderWithThisMeal = this.orders.find(order =>
          order.items.some(item => item.meal?._id === mealId)
        );

        if (orderWithThisMeal) {
          const orderId = orderWithThisMeal._id;
          const reviewDate = review.date || review.createdAt;
          const dateString = reviewDate
            ? new Date(reviewDate).toISOString()
            : new Date().toISOString();

          this.orderReviews[orderId] = {
            orderId,
            mealId,
            mealName: review.mealName || (orderWithThisMeal.items[0]?.meal?.name) || 'Meal',
            rating: review.rating,
            comment: review.comment || '',
            date: dateString,
            author: review.author
          };
        }
      });
    });
  }

  async onReviewSubmit(event: { orderId: string; mealId: string; rating: number; comment: string }): Promise<void> {
    const { orderId, mealId, rating, comment } = event;

    if (!mealId) {
      this.snackBar.open('Meal ID is required', 'Close', { duration: 3000 });
      return;
    }

    this.reviewLoading[orderId] = true;

    const reviewData = {
      rating,
      comment,
      productId: mealId,
      orderId: orderId,
      mealName: this.orders.find(o => o._id === orderId)?.items[0]?.meal?.name || 'Meal'
    };

    this.reviewService.addReview(reviewData).subscribe({
      next: (review: any) => {
        this.orderReviews[orderId] = {
          orderId,
          mealId,
          mealName: review.mealName || this.orders.find(o => o._id === orderId)?.items[0]?.meal?.name || 'Meal',
          rating: review.rating || rating,
          comment: review.comment || comment,
          date: review.date || review.createdAt || new Date().toISOString()
        };
        this.showReviewForm[orderId] = false;
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        this.snackBar.open('Failed to submit review. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      },
      complete: () => {
        this.reviewLoading[orderId] = false;
      }
    });
  }

  private showLoginMessage(): void {
    this._showLoginPrompt = true;
    this.snackBar.open('Please log in to view your reviews', 'Login', {
      duration: 5000,
      panelClass: ['error-snackbar']
    }).onAction().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  hasOrderBeenReviewed(orderId: string): boolean {
    return !!this.orderReviews[orderId];
  }
  
  // Add this method to handle review form submission from the template
  onReviewFormSubmit(event: any): void {
    if (event && event.orderId && event.rating) {
      this.onReviewSubmit(event);
    }
  }
}