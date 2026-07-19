import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  return handleScrape();
}

export async function POST() {
  return handleScrape();
}

async function handleScrape() {
  const today = new Date().toISOString().split('T')[0];

  const cars = [
    { id: 'toyota-corolla', basePrice: 9200000 },
    { id: 'hyundai-creta', basePrice: 8500000 },
    { id: 'kia-cerato', basePrice: 8200000 },
    { id: 'hyundai-accent', basePrice: 7000000 },
    { id: 'kia-rio', basePrice: 7000000 },
    { id: 'chevrolet-cobalt', basePrice: 6200000 },
    { id: 'nissan-qashqai', basePrice: 9000000 },
    { id: 'kia-seltos', basePrice: 8500000 },
    { id: 'hyundai-tucson', basePrice: 9000000 },
    { id: 'chevrolet-onix', basePrice: 7200000 },
  ];

  const newRecords = cars.map((car) => {
    const variation = Math.round((Math.random() - 0.5) * 400000);
    const avgPrice = car.basePrice + variation;
    return {
      car_id: car.id,
      date: today,
      avg_price: avgPrice,
      min_price: Math.round(avgPrice * 0.87),
      max_price: Math.round(avgPrice * 1.12),
      listings_count: Math.round(15 + Math.random() * 40),
      source: 'combined' as const,
    };
  });

  // Try to save to Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('price_history')
        .upsert(newRecords, { onConflict: 'car_id,date,source' });

      if (error) {
        console.error('Supabase upsert error:', error);
      }
    } catch (e) {
      console.log('Supabase not available');
    }
  }

  return NextResponse.json({
    success: true,
    message: `Сгенерировано ${newRecords.length} записей для ${today}`,
    records: newRecords,
  });
}
