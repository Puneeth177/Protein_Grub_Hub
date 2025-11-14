// delivery-map.component.ts
import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { DeliveryTrackingService, DeliveryStatus } from '../../services/delivery-tracking.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delivery-map',
  standalone: true,
  imports: [CommonModule], // Add this line
  templateUrl: './delivery-map.component.html',
  styleUrls: ['./delivery-map.component.css'],
  providers: [DeliveryTrackingService]
})
export class DeliveryMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  private map: any;
  private markers: L.Marker[] = [];
  private polyline: any;
  private statusSubscription: Subscription | null = null;
  currentStatus: string = 'Order Placed';

  constructor(public deliveryService: DeliveryTrackingService) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.simulateDelivery();
  }

  ngOnDestroy(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

    get statusUpdates() {
        return this.deliveryService.getCurrentStatus();
    }

  private initMap(): void {
    // Default coordinates (can be changed based on actual location)
    const defaultCoords: L.LatLngExpression = [12.9716, 77.5946]; // Bangalore coordinates
    
    // Initialize the map
    this.map = L.map(this.mapContainer.nativeElement).setView(defaultCoords, 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add restaurant marker
    const restaurantIcon = L.icon({
      iconUrl: 'assets/images/restaurant-marker.png', // Add your own marker icon
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    // Default restaurant marker if custom icon not found
    L.marker(defaultCoords, {
      icon: restaurantIcon
    })
    .addTo(this.map)
    .bindPopup('Protein Grub Hub')
    .openPopup();
  }

  private simulateDelivery(): void {
    // Clear existing markers and polyline
    this.clearMap();

    // Get delivery path
    const path = this.deliveryService.getDeliveryPath();
    const restaurantLocation = path[0];
    const deliveryLocation = path[path.length - 1];

    // Add restaurant marker
    this.addMarker(restaurantLocation, 'Protein Grub Hub', 'restaurant');

    // Add delivery location marker
    this.addMarker(deliveryLocation, 'Delivery Location', 'delivery');

    // Add polyline for delivery path
    this.polyline = L.polyline(path as L.LatLngExpression[], { 
      color: '#3498db',
      weight: 5,
      opacity: 0.7
    }).addTo(this.map);

    // Fit map to show the entire path
    this.map.fitBounds(this.polyline.getBounds());

    // Simulate delivery person movement
    this.statusSubscription = this.deliveryService.simulateOrderTracking('123').subscribe(
      statuses => {
        const activeStatus = statuses.find(s => s.active) || statuses[statuses.length - 1];
        this.currentStatus = activeStatus.status;

        // Update delivery person position
        if (activeStatus.location) {
          this.updateDeliveryPerson(activeStatus.location);
        }
      }
    );
  }

  private addMarker(coords: { lat: number; lng: number }, title: string, type: 'restaurant' | 'delivery' | 'delivery-person'): void {
    let icon;
    
    if (type === 'restaurant') {
      icon = L.icon({
        iconUrl: 'assets/images/restaurant-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
    } else if (type === 'delivery') {
      icon = L.icon({
        iconUrl: 'assets/images/delivery-location.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
    } else {
      // Delivery person icon
      icon = L.icon({
        iconUrl: 'assets/images/delivery-bike.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
    }

    const marker = L.marker([coords.lat, coords.lng], { icon })
      .addTo(this.map)
      .bindPopup(title);

    this.markers.push(marker);
  }

  private updateDeliveryPerson(coords: { lat: number; lng: number }): void {
    // Remove existing delivery person marker if it exists
    this.markers = this.markers.filter(marker => {
      const icon = (marker as any).options.icon;
      if (icon && icon.options && icon.options.iconUrl && 
          icon.options.iconUrl.includes('delivery-bike')) {
        this.map.removeLayer(marker);
        return false;
      }
      return true;
    });

    // Add updated delivery person marker
    this.addMarker(coords, 'Delivery Partner', 'delivery-person');
  }

  private clearMap(): void {
    // Remove all markers
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    // Remove polyline if it exists
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
    }
  }
}