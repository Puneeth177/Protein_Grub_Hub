// delivery-tracking.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, take } from 'rxjs/operators';

export interface DeliveryStatus {
  status: string;
  description: string;
  completed: boolean;
  active: boolean;
  time: string;
  location?: {
    lat: number;
    lng: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryTrackingService {
  private statuses: DeliveryStatus[] = [
    { 
      status: 'Order Placed', 
      description: 'We have received your order', 
      completed: true, 
      active: false, 
      time: this.getCurrentTime(),
      location: { lat: 12.9716, lng: 77.5946 } // Default location
    },
    { 
      status: 'Preparing', 
      description: 'Your meal is being prepared', 
      completed: false, 
      active: true, 
      time: this.getCurrentTime(5),
      location: { lat: 12.9716, lng: 77.5946 } // Same as order placed
    },
    { 
      status: 'Out for Delivery', 
      description: 'Your order is on the way', 
      completed: false, 
      active: false, 
      time: this.getCurrentTime(15),
      location: { lat: 12.9750, lng: 77.6000 } // Slightly different location
    },
    { 
      status: 'Delivered', 
      description: 'Enjoy your meal!', 
      completed: false, 
      active: false, 
      time: this.getCurrentTime(30),
      location: { lat: 12.9800, lng: 77.6100 } // Final delivery location
    }
  ];

  private statusSubject = new BehaviorSubject<DeliveryStatus[]>(this.statuses);

  constructor() {}

  private getCurrentTime(minutesToAdd = 0): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutesToAdd);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  simulateOrderTracking(orderId: string): Observable<DeliveryStatus[]> {
    // Reset statuses
    this.statuses = this.statuses.map((status, index) => ({
      ...status,
      completed: false,
      active: index === 0,
      time: this.getCurrentTime(index * 10) // Add 10 minutes between each status
    }));

    // Simulate status updates every 5 seconds
    return interval(5000).pipe(
      take(this.statuses.length),
      map(i => {
        // Update status
        this.statuses = this.statuses.map((status, index) => ({
          ...status,
          completed: index <= i,
          active: index === i + 1
        }));
        
        this.statusSubject.next([...this.statuses]);
        return this.statuses;
      })
    );
  }

  getCurrentStatus(): Observable<DeliveryStatus[]> {
    return this.statusSubject.asObservable();
  }

  getDeliveryPath(): { lat: number; lng: number }[] {
    // Return a path from restaurant to delivery location
    return [
      { lat: 12.9716, lng: 77.5946 },  // Restaurant
      { lat: 12.9750, lng: 77.6000 },  // Intermediate point
      { lat: 12.9800, lng: 77.6100 }   // Delivery location
    ];
  }
}