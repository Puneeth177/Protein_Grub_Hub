// Update the OrderHistory interface in order-history.model.ts
export interface OrderHistory {
  _id: string;
  orderNumber: string;
  date: Date;
  status: string;
  items: Array<{
    meal: {
      _id: string;
      name: string;
      price: number;
      protein_grams: number;
      calories: number;
      image_url?: string;
    };
    quantity: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  hasReview?: boolean; // Add this line
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