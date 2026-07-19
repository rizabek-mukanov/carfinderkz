import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PriceRecord } from '@/lib/types';

// Deterministic pseudo-random based on string seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Normalize to 0-1
  return Math.abs(Math.sin(hash) * 10000) % 1;
}

function generateMockPriceHistory(): PriceRecord[] {
  const cars = [
    { id: 'toyota-corolla', basePrice: 9200000, trend: 0.002 },
    { id: 'hyundai-creta', basePrice: 8500000, trend: -0.001 },
    { id: 'kia-cerato', basePrice: 8200000, trend: 0.001 },
    { id: 'hyundai-accent', basePrice: 7000000, trend: -0.002 },
    { id: 'kia-rio', basePrice: 7000000, trend: -0.001 },
    { id: 'chevrolet-cobalt', basePrice: 6200000, trend: 0.0005 },
    { id: 'nissan-qashqai', basePrice: 9000000, trend: 0.0015 },
    { id: 'kia-seltos', basePrice: 8500000, trend: -0.0005 },
    { id: 'hyundai-tucson', basePrice: 9000000, trend: 0.001 },
    { id: 'chevrolet-onix', basePrice: 7200000, trend: -0.0015 },
  ];

  const records: PriceRecord[] = [];
  const today = new Date();

  for (let day = 30; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    for (const car of cars) {
      const seed = `${car.id}-${dateStr}`;
      const random = seededRandom(seed);
      
      // Price with trend + random variation
      const trendFactor = 1 + car.trend * (30 - day);
      const variation = (random - 0.5) * 400000; // ±200,000 tenge
      const avgPrice = Math.round(car.basePrice * trendFactor + variation);
      const minPrice = Math.round(avgPrice * (0.85 + random * 0.05));
      const maxPrice = Math.round(avgPrice * (1.1 + random * 0.05));
      const listingsCount = Math.round(15 + random * 40);

      records.push({
        car_id: car.id,
        date: dateStr,
        avg_price: avgPrice,
        min_price: minPrice,
        max_price: maxPrice,
        listings_count: listingsCount,
        source: 'combined',
      });
    }
  }

  return records;
}

export async function GET() {
  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data && data.length > 0) {
        return NextResponse.json(data);
      }
    } catch (e) {
      console.log('Supabase not available, using mock data');
    }
  }

  // Fallback to mock data
  const mockData = generateMockPriceHistory();
  return NextResponse.json(mockData);
}
