export interface Order {
  _id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  delivery_address: DeliveryAddress;
  payment_method: string;
  order_status: 'Order Placed' | 'In the Kitchen' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  created_at: Date;
  estimated_delivery: Date;
  actual_delivery?: Date;
}

export interface OrderItem {
  meal_id: string;
  meal: Meal;
  quantity: number;
  customizations?: string[];
  price: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  delivery_instructions?: string;
}

export interface CartItem {
  meal: Meal;
  quantity: number;
  customizations?: string[];
}

import { Meal } from './meal.model';