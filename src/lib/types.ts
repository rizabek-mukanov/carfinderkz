export interface Car {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  priceRange: { min: number; max: number };
  bodyType: 'sedan' | 'crossover';
  engine: string;
  transmission: string;
  description: string;
  pros: string[];
  cons: string[];
  whyFirstCar: string;
  imageUrl: string;
  color: string;
  searchUrls: {
    kolesa: string;
    mycar: string;
  };
}

export interface PriceRecord {
  id?: number;
  car_id: string;
  date: string;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  listings_count: number | null;
  source: 'kolesa' | 'mycar' | 'combined';
}
