import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../services/location.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.css']
})
export class LocationPickerComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  searchQuery = '';
  searchResults: any[] = [];
  isLoading = false;
  selectedLocation: any = null;
  map: L.Map | null = null;
  marker: L.Marker | null = null;

  constructor(private locationService: LocationService) {}

  onLocationSelect(location: any) {
  this.locationService.updateLocation({
    address: location.address,
    lat: location.lat,
    lng: location.lng
  });
}

  ngOnInit() {
    this.loadCurrentLocation();
  }

  ngAfterViewInit() {
    this.initializeMap();
  }

  private initializeMap() {
    if (!this.mapContainer?.nativeElement) return;

    this.map = this.locationService.createMap(this.mapContainer.nativeElement, {
      center: [20.5937, 78.9629],
      zoom: 13
    });

    // Add click handler to set location
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setLocationFromLatLng(e.latlng.lat, e.latlng.lng);
    });
  }

  async loadCurrentLocation() {
    try {
      this.isLoading = true;
      const position = await this.locationService.getCurrentPosition();
      this.setLocationFromLatLng(
        position.coords.latitude,
        position.coords.longitude
      );
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async setLocationFromLatLng(lat: number, lng: number) {
    try {
      this.isLoading = true;
      const address = await this.locationService.getAddressFromCoords(lat, lng);
      
      this.selectedLocation = {
        lat,
        lng,
        address
      };
      
      // Update or create marker
      if (this.map) {
        if (this.marker) {
          this.marker.setLatLng([lat, lng]);
        } else {
          this.marker = this.locationService.createMarker(lat, lng, this.map, {
            draggable: true
          });
          
          // Add drag end handler
          this.marker.on('dragend', (e: any) => {
            const newLatLng = e.target.getLatLng();
            this.setLocationFromLatLng(newLatLng.lat, newLatLng.lng);
          });
        }
        
        // Center the map on the selected location
        this.map.setView([lat, lng], 15);
      }
    } catch (error) {
      console.error('Error getting address:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange() {
    if (this.searchQuery.length > 2) {
      this.isLoading = true;
      this.locationService.searchLocations(this.searchQuery).subscribe({
        next: (results: any[]) => {
          this.searchResults = results || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error searching locations:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.searchResults = [];
    }
  }

  selectPlace(place: any) {
    if (!place.lat || !place.lon) return;
    
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    
    this.selectedLocation = {
      lat,
      lng,
      address: place.display_name
    };
    
    this.setLocationFromLatLng(lat, lng);
    this.searchResults = []; // Clear search results
  }

  confirmLocation() {
    if (this.selectedLocation) {
      this.locationService.setCurrentLocation(this.selectedLocation);
      // Navigate back or to home
      window.history.back();
    }
  }
}