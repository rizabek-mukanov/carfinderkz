import { NextResponse } from 'next/server';
import { carsData } from '@/lib/cars-data';

export async function GET() {
  return NextResponse.json(carsData);
}
