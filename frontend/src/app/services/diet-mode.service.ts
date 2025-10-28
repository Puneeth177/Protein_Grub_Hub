import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DietMode = 'neutral' | 'veg' | 'nonveg';

@Injectable({ providedIn: 'root' })
export class DietModeService {
  private readonly mode$ = new BehaviorSubject<DietMode>('neutral');

  getMode$() { return this.mode$.asObservable(); }
  getMode(): DietMode { return this.mode$.value; }
  setMode(mode: DietMode) { this.mode$.next(mode); }
  toggleNext() {
    const order: DietMode[] = ['neutral', 'veg', 'nonveg'];
    const i = order.indexOf(this.mode$.value);
    this.mode$.next(order[(i + 1) % order.length]);
  }
}