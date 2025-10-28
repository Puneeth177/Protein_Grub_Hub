import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Review, ReviewListResponse, ReactionType } from '../models/review.interface';
import { StorageService } from './storage.service';


@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly API_URL = (environment.apiUrl?.trim() || 'http://localhost:3000/api') + '/reviews';

  constructor(private http: HttpClient, private storage: StorageService) {}

  list(params: { productId?: string; limit?: number; skip?: number; sort?: 'latest' | 'top' | 'rating' }): Observable<ReviewListResponse> {
    let p = new HttpParams();
    if (params.productId) p = p.set('productId', params.productId);
    if (params.limit != null) p = p.set('limit', String(params.limit));
    if (params.skip != null) p = p.set('skip', String(params.skip));
    if (params.sort) p = p.set('sort', params.sort);
    return this.http.get<ReviewListResponse>(`${this.API_URL}`, { params: p })
      .pipe(catchError(err => throwError(() => err)));
  }

  create(body: { productId?: string; rating: number; text?: string }): Observable<Review> {
    return this.http.post<Review>(`${this.API_URL}`, body, { headers: this.authHeaders() })
      .pipe(catchError(err => throwError(() => err)));
  }

  update(reviewId: string, body: { rating?: number; text?: string }): Observable<Review> {
    return this.http.put<Review>(`${this.API_URL}/${reviewId}`, body, { headers: this.authHeaders() })
      .pipe(catchError(err => throwError(() => err)));
  }

  remove(reviewId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${reviewId}`, { headers: this.authHeaders() })
      .pipe(catchError(err => throwError(() => err)));
  }

  get(reviewId: string): Observable<Review> {
    return this.http.get<Review>(`${this.API_URL}/${reviewId}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  react(reviewId: string, type: ReactionType): Observable<{ likes: number; dislikes: number; userReaction: ReactionType | null }> {
    return this.http.post<{ likes: number; dislikes: number; userReaction: ReactionType | null }>(
      `${this.API_URL}/${reviewId}/react`,
      { type },
      { headers: this.authHeaders() }
    ).pipe(catchError(err => throwError(() => err)));
  }

  private authHeaders(): HttpHeaders {
    const token = this.storage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    }
}