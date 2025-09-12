export interface OrderHistory {
  _id: string;
  orderNumber: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
}

export interface OrderItem {
  meal: {
    _id: string;
    name: string;
    image_url: string;
    protein_grams: number;
    calories: number;
    price: number;
  };
  quantity: number;
  customizations?: string[];
}