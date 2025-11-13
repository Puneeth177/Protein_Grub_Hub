import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Avatar {
  id: string;
  url: string;
  alt: string;
}

export interface AvatarUploadResponse {
  url: string;
  sizes: {
    [key: string]: string;
  };
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private readonly API_URL = environment.apiUrl?.trim() || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getDefaultAvatars(): Observable<Avatar[]> {
    return this.http.get<Avatar[]>(`${this.API_URL}/avatars/defaults`)
      .pipe(catchError(error => this.handleError(error)));
  }

  uploadAvatar(file: File, userId: string): Observable<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getAuthToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return this.http.post<AvatarUploadResponse>(
      `${this.API_URL}/users/${userId}/avatar`,
      formData,
      { headers }
    ).pipe(catchError(error => this.handleError(error)));
  }

  setDefaultAvatar(avatarId: string, userId: string): Observable<AvatarUploadResponse> {
    const token = this.getAuthToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return this.http.post<AvatarUploadResponse>(
      `${this.API_URL}/users/${userId}/avatar`,
      { avatarId },
      { headers }
    ).pipe(catchError(error => this.handleError(error)));
  }

  deleteAvatar(userId: string): Observable<{ message: string }> {
    const token = this.getAuthToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return this.http.delete<{ message: string }>(
      `${this.API_URL}/users/${userId}/avatar`,
      { headers }
    ).pipe(catchError(error => this.handleError(error)));
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred while processing avatar';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Invalid file format or size';
    } else if (error.status === 401) {
      errorMessage = 'Not authenticated';
    } else if (error.status === 413) {
      errorMessage = 'File size exceeds maximum allowed (5 MB)';
    } else if (error.status === 500) {
      errorMessage = 'Server error while processing avatar';
    }

    return throwError(() => ({ message: errorMessage, statusCode: error.status }));
  }
}
