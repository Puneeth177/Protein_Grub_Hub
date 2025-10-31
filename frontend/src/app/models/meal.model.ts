export interface Meal {
  _id: string;
  name: string;
  description: string;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  calories: number;
  price: number;
  image_url: string;
  category?: string;
  dietary_tags: string[];
  inventory?: number;
  tags?: string[];
}