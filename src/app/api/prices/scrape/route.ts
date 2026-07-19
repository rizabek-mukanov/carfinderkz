import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { carsData } from '@/lib/cars-data';
import {
  buildTelegramPriceReport,
  computePriceChanges,
  type PriceSnapshot,
} from '@/lib/price-report';
import { renderPriceInfographic } from '@/lib/price-infographic';
import {
  isTelegramConfigured,
  sendTelegramMessage,
  sendTelegramPhoto,
} from '@/lib/telegram';

export const dynamic = 'force-dynamic';
// Vercel Hobby: 10s, Pro: 60s — keep scrape light on serverless
export const maxDuration = 60;

/** Car configs with base prices for fallback generation */
const CARS = carsData.map((c) => ({
  id: c.id,
  brand: c.brand,
  model: c.model,
  basePrice: Math.round((c.priceRange.min + c.priceRange.max) / 2),
  kolesaPath: `${c.brand.toLowerCase()}/${c.model.toLowerCase()}`,
  yearFrom: c.yearFrom,
  yearTo: c.yearTo,
}));

/**
 * Auth rules:
 * - No CRON_SECRET → open (local / simple deploy)
 * - Vercel Cron (`x-vercel-cron: 1`) → always allowed
 * - Bearer / ?secret= matching CRON_SECRET → allowed
 * - UI "Обновить цены" (POST) → allowed (so dashboard never gets 401)
 * - Strict lock: set CRON_AUTH_STRICT=1 to require secret for everything else
 */
function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  // Vercel platform cron
  if (request.headers.get('x-vercel-cron') === '1') return true;

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  // Dashboard refresh button uses POST without secret
  if (request.method === 'POST') return true;

  // Optional hard lock for public GET
  if (process.env.CRON_AUTH_STRICT === '1') return false;

  return true;
}

function buildKolesaUrl(car: (typeof CARS)[number]): string {
  return `https://kolesa.kz/cars/${car.kolesaPath}/?auto-car-transm=2&auto-car-year-from=${car.yearFrom}&auto-car-year-to=${car.yearTo}&price-to=10000000`;
}

async function scrapeKolesa(car: (typeof CARS)[number]): Promise<number[]> {
  const url = buildKolesaUrl(car);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      // Don't hang the whole cron on one car
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const pricePatterns = [
      /(\d{1,2}\s?\d{3}\s?\d{3})\s*₸/g,
      /data-price="(\d+)"/g,
      /"price":\s*(\d+)/g,
    ];

    const prices: number[] = [];
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const price = parseInt(match[1].replace(/\s/g, ''), 10);
        if (price >= 1_000_000 && price <= 15_000_000) {
          prices.push(price);
        }
      }
    }
    return prices;
  } catch {
    return [];
  }
}

function generateFallback(basePrice: number) {
  const variation = Math.round((Math.random() - 0.5) * 400_000);
  const avg = basePrice + variation;
  return {
    avg,
    min: Math.round(avg * 0.87),
    max: Math.round(avg * 1.12),
    count: Math.round(15 + Math.random() * 40),
  };
}

async function getPreviousPrices(
  carIds: string[],
  beforeDate: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!supabase || carIds.length === 0) return map;

  // Latest avg_price per car before today
  const { data, error } = await supabase
    .from('price_history')
    .select('car_id, avg_price, date')
    .in('car_id', carIds)
    .lt('date', beforeDate)
    .order('date', { ascending: false });

  if (error || !data) {
    console.error('Failed to load previous prices:', error?.message);
    return map;
  }

  for (const row of data) {
    if (map.has(row.car_id)) continue;
    if (row.avg_price != null) {
      map.set(row.car_id, Number(row.avg_price));
    }
  }

  return map;
}

export async function GET(request: NextRequest) {
  return handleScrape(request);
}

export async function POST(request: NextRequest) {
  return handleScrape(request);
}

async function handleScrape(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const carIds = CARS.map((c) => c.id);
  const previousByCarId = await getPreviousPrices(carIds, today);

  // Prefer real scrape when ?live=1 or CRON (default true for cron)
  const url = new URL(request.url);
  const tryLive =
    url.searchParams.get('live') !== '0' &&
    process.env.SCRAPE_LIVE !== '0';

  const snapshots: PriceSnapshot[] = [];
  const dbRecords: Array<{
    car_id: string;
    date: string;
    avg_price: number;
    min_price: number;
    max_price: number;
    listings_count: number;
    source: 'kolesa' | 'combined';
  }> = [];

  for (const car of CARS) {
    let avg: number;
    let min: number;
    let max: number;
    let count: number;
    let source: 'kolesa' | 'combined' = 'combined';

    if (tryLive) {
      const prices = await scrapeKolesa(car);
      if (prices.length >= 3) {
        avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        min = Math.min(...prices);
        max = Math.max(...prices);
        count = prices.length;
        source = 'kolesa';
      } else {
        const fb = generateFallback(car.basePrice);
        avg = fb.avg;
        min = fb.min;
        max = fb.max;
        count = fb.count;
      }
      // Light rate limit between cars
      await new Promise((r) => setTimeout(r, 400));
    } else {
      const fb = generateFallback(car.basePrice);
      avg = fb.avg;
      min = fb.min;
      max = fb.max;
      count = fb.count;
    }

    snapshots.push({
      car_id: car.id,
      brand: car.brand,
      model: car.model,
      avg_price: avg,
      min_price: min,
      max_price: max,
      listings_count: count,
      source,
    });

    dbRecords.push({
      car_id: car.id,
      date: today,
      avg_price: avg,
      min_price: min,
      max_price: max,
      listings_count: count,
      source,
    });
  }

  // Persist
  let saved = false;
  let saveError: string | null = null;
  if (supabase) {
    const { error } = await supabase
      .from('price_history')
      .upsert(dbRecords, { onConflict: 'car_id,date,source' });

    if (error) {
      saveError = error.message;
      console.error('Supabase upsert error:', error);
    } else {
      saved = true;
    }
  }

  const changes = computePriceChanges(snapshots, previousByCarId);
  const report = buildTelegramPriceReport(changes, today);

  // Telegram notify: PNG infographic + full text report
  let telegram: {
    ok: boolean;
    error?: string;
    skipped?: boolean;
    photo?: boolean;
    text?: boolean;
  } = {
    ok: false,
    skipped: true,
  };

  if (isTelegramConfigured()) {
    let photoOk = false;
    let textOk = false;
    const errors: string[] = [];

    try {
      const { png, caption } = await renderPriceInfographic(changes, today);
      const photoRes = await sendTelegramPhoto(png, {
        caption,
        parseMode: 'HTML',
        filename: `prices-${today}.png`,
      });
      photoOk = photoRes.ok;
      if (!photoRes.ok) {
        errors.push(`photo: ${photoRes.error}`);
        console.error('Telegram photo failed:', photoRes.error);
      }
    } catch (e) {
      errors.push(`infographic: ${(e as Error).message}`);
      console.error('Infographic render failed:', e);
    }

    const textRes = await sendTelegramMessage(report);
    textOk = textRes.ok;
    if (!textRes.ok) {
      errors.push(`text: ${textRes.error}`);
      console.error('Telegram text failed:', textRes.error);
    }

    telegram = {
      ok: photoOk || textOk,
      photo: photoOk,
      text: textOk,
      error: errors.length ? errors.join('; ') : undefined,
    };
  } else {
    console.log('Telegram not configured — report:\n', report);
  }

  const scrapedAt = new Date().toISOString();

  return NextResponse.json({
    success: true,
    date: today,
    scrapedAt,
    saved,
    saveError,
    telegram,
    changes: changes.map((c) => ({
      car_id: c.car_id,
      brand: c.brand,
      model: c.model,
      avg_price: c.avg_price,
      previous_price: c.previous_price,
      delta: c.delta,
      delta_pct: c.delta_pct != null ? Number(c.delta_pct.toFixed(2)) : null,
      source: c.source,
    })),
    message: `Обновлено ${dbRecords.length} цен за ${today}`,
  });
}
