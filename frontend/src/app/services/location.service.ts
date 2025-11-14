import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private currentLocation = new BehaviorSubject<any>(null);
  private readonly STORAGE_KEY = 'user_location';

  constructor(private http: HttpClient) {
    this.loadSavedLocation();
    this.detectAndSetCurrentLocation();
  }

  private loadSavedLocation() {
    const savedLocation = localStorage.getItem(this.STORAGE_KEY);
    if (savedLocation) {
      this.currentLocation.next(JSON.parse(savedLocation));
    }
  }

  getCurrentLocation(): Observable<any> {
    return this.currentLocation.asObservable();
  }

  setCurrentLocation(location: any) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(location));
    this.currentLocation.next(location);
  }

  async getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
      // First try with more detailed parameters
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&namedetails=1&accept-language=en`;
      const headers = {
        'Accept-Language': 'en-US,en;q=0.9'
      };
      
      const response: any = await this.http.get(url, { headers }).toPromise();
      
      // Try to get the most specific location name
      const address = response.address;
      if (address) {
        // Try to get the most specific area name in this order
        const possibleNames = [
          address.neighbourhood,
          address.suburb,
          address.city_district,
          address.county,
          address.city,
          response.display_name
        ];
        
        // Return the first non-empty, non-generic name
        const name = possibleNames.find(name => 
          name && 
          !name.toLowerCase().includes('bangalore') &&
          !name.toLowerCase().includes('bengaluru') &&
          name.trim() !== ''
        );
        
        if (name) {
          return name;
        }
      }
      
      // Fallback to display_name if no specific area found
      return response.display_name || 'Your location';
      
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Your location';
    }
  }

  updateLocation(location: any): void {
    this.setCurrentLocation(location);
  }

  async detectAndSetCurrentLocation(): Promise<void> {
    try {
      // First try with high accuracy geolocation
      try {
        const position = await this.getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;
        
        // Get the most detailed address possible
        const fullAddress = await this.getAddressFromCoords(latitude, longitude);
        
        // Try to get a more specific area name
        let areaName = fullAddress;
        if (fullAddress.toLowerCase().includes('bangalore') || fullAddress.toLowerCase().includes('bengaluru')) {
          // If the address still contains Bangalore, try to get a more specific area
          const response: any = await this.http.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1&namedetails=1&accept-language=en`
          ).toPromise();
          
          // Try to get the most specific area name from the response
          const address = response.address || {};
          areaName = address.neighbourhood || 
                    address.suburb || 
                    address.city_district || 
                    address.residential ||
                    fullAddress;
        }
        
        this.setCurrentLocation({
          lat: latitude,
          lng: longitude,
          address: areaName,
          accuracy: accuracy,
          fullAddress: fullAddress
        });
      } catch (gpsError) {
        console.log('GPS-based location failed, trying IP-based geolocation...', gpsError);
        await this.tryIpBasedGeolocation();
      }
    } catch (error) {
      console.error('All location detection methods failed:', error);
      // Set a default location if all methods fail
      this.setDefaultLocation();
    }
  }

  private extractAreaName(fullAddress: string): string {
    // Common area names in Bangalore that we want to detect
    const bangaloreAreas = [
      'Basavanagudi', 'Jayanagar', 'Yelahanka', 'Banashankari', 'Indiranagar',
      'Koramangala', 'Whitefield', 'Marathahalli', 'Malleswaram', 'Rajajinagar',
      'Hebbal', 'Yeshwanthpur', 'Jalahalli', 'Vijayanagar', 'BTM Layout',
      'HSR Layout', 'JP Nagar', 'Bannerghatta Road', 'Electronic City', 'Sarjapur',
      'Bellandur', 'Mahadevapura', 'Domlur', 'RT Nagar', 'CV Raman Nagar',
      'Shivajinagar', 'Frazer Town', 'Cox Town', 'Ulsoor', 'Richmond Town'
    ];

    // First, try to find any of these area names in the address
    const addressLower = fullAddress.toLowerCase();
    for (const area of bangaloreAreas) {
      if (addressLower.includes(area.toLowerCase())) {
        return area; // Return the properly capitalized version from our list
      }
    }

    // If no known area found, try to extract from the address structure
    // Common patterns in OpenStreetMap addresses: "Area, Suburb, City, State, Country"
    const parts = fullAddress.split(',').map(part => part.trim());
    
    // If the address has multiple parts and the first part is not too long, use it
    if (parts.length > 1 && parts[0].length < 30) {
      return parts[0];
    }
    
    // Otherwise, try to find the most specific part that's not too generic
    const genericTerms = ['bangalore', 'bengaluru', 'karnataka', 'india'];
    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (!genericTerms.some(term => lowerPart.includes(term)) && part.length > 3) {
        return part;
      }
    }
    
    // Fallback to the first part if nothing else works
    return parts[0] || fullAddress;
  }

  private async tryIpBasedGeolocation(): Promise<void> {
    try {
      // Using ipapi.co for IP-based geolocation
      const response: any = await this.http.get('https://ipapi.co/json/').toPromise();
      const { latitude, longitude, city, region, country_name } = response;
      
      this.setCurrentLocation({
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        address: city || region || country_name || 'Your Location',
        accuracy: 1000, // Approximate accuracy for IP-based location
        source: 'ip'
      });
    } catch (ipError) {
      console.error('IP-based geolocation failed:', ipError);
      throw ipError;
    }
  }

  private setDefaultLocation(): void {
    this.setCurrentLocation({
      lat: 12.9716,  // Default to Bangalore coordinates
      lng: 77.5946,
      address: 'Bangalore',
      accuracy: 10000, // Very low accuracy
      source: 'default'
    });
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser');
      } else {
        // First try with high accuracy
        navigator.geolocation.getCurrentPosition(
          position => {
            // If accuracy is good enough (less than 100 meters), use it
            if (position.coords.accuracy <= 100) {
              resolve(position);
            } else {
              // If not accurate enough, try again with a longer timeout
              console.log('First attempt accuracy not sufficient, trying again...');
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 15000,  // 15 seconds
                  maximumAge: 0  // Force fresh position
                }
              );
            }
          },
          error => {
            console.error('Geolocation error (high accuracy):', error);
            // Fall back to lower accuracy if high accuracy fails
            console.log('Falling back to lower accuracy...');
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 0
              }
            );
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,  // 10 seconds
            maximumAge: 0,   // Force fresh position
          }
        );
      }
    });
  }

  searchLocations(query: string): Observable<any> {
    if (!query) {
      return of([]);
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&accept-language=en`;
    const headers = {
      'Accept-Language': 'en-US,en;q=0.9'
    };
    return this.http.get(url, { headers });
  }

  getDefaultMapOptions(): L.MapOptions {
    return {
      center: [20.5937, 78.9629], // Default to India center
      zoom: 4,
      zoomControl: false, // We'll add this manually
      attributionControl: false // We'll add this manually
    };
  }

  createMap(element: string | HTMLElement, options?: L.MapOptions): L.Map {
    const map = L.map(element, {
      ...this.getDefaultMapOptions(),
      ...(options || {})
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add zoom control with custom position
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Add attribution
    L.control.attribution({
      position: 'bottomright'
    }).addTo(map);

    return map;
  }

  createMarker(lat: number, lng: number, map: L.Map, options?: L.MarkerOptions): L.Marker {
    const defaultIcon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      shadowUrl: 'assets/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    return L.marker([lat, lng], {
      icon: defaultIcon,
      draggable: true,
      ...options
    }).addTo(map);
  }
}