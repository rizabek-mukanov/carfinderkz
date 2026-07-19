'use client';

import { useState, useEffect } from 'react';
import { Car, PriceRecord } from '@/lib/types';
import Header from './Header';
import CarCard from './CarCard';
import CarModal from './CarModal';
import PriceChart from './PriceChart';

export default function Dashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'mock' | 'supabase'>('mock');
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  /** Prefer newest calendar date; created_at is unreliable after upsert same day. */
  const resolveLastUpdated = (pricesData: PriceRecord[]): string | null => {
    if (pricesData.length === 0) return null;

    const maxDate = pricesData.reduce(
      (max, r) => (r.date > max ? r.date : max),
      pricesData[0].date
    );

    // Among records for the latest day, pick newest created_at if present
    const sameDay = pricesData.filter((r) => r.date === maxDate);
    let newestCreated: string | null = null;
    for (const r of sameDay) {
      if (!r.created_at) continue;
      if (!newestCreated || r.created_at > newestCreated) {
        newestCreated = r.created_at;
      }
    }

    // If created_at is from an older day than maxDate, ignore it (stale upsert)
    if (newestCreated) {
      const createdDay = newestCreated.slice(0, 10);
      if (createdDay === maxDate) return newestCreated;
    }

    return maxDate;
  };

  const fetchData = async (opts?: { keepLastUpdated?: string }) => {
    setLoading(true);
    try {
      const [carsRes, pricesRes] = await Promise.all([
        fetch('/api/cars'),
        fetch('/api/prices'),
      ]);

      if (carsRes.ok) {
        const carsData = await carsRes.json();
        setCars(carsData);
      }

      if (pricesRes.ok) {
        const sourceHeader = pricesRes.headers.get('x-data-source');
        if (sourceHeader === 'supabase') {
          setDataSource('supabase');
        } else {
          setDataSource('mock');
        }
        const pricesData = await pricesRes.json();
        setPriceHistory(pricesData);

        // After a successful scrape, keep the exact scrape timestamp from the API
        if (opts?.keepLastUpdated) {
          setLastUpdated(opts.keepLastUpdated);
        } else {
          setLastUpdated(resolveLastUpdated(pricesData));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshError(null);
    try {
      const res = await fetch('/api/prices/scrape', { method: 'POST' });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRefreshError(
          res.status === 401
            ? 'Ошибка 401: нет доступа к scrape'
            : `Ошибка обновления (${res.status})`
        );
        console.error('Scrape failed:', res.status, body);
        return;
      }

      const scrapedAt =
        typeof body.scrapedAt === 'string' ? body.scrapedAt : new Date().toISOString();
      await fetchData({ keepLastUpdated: scrapedAt });
    } catch (error) {
      console.error('Error refreshing prices:', error);
      setRefreshError('Не удалось обновить цены');
    }
  };

  const getLatestPrice = (carId: string): number | null => {
    const carPrices = priceHistory
      .filter((r) => r.car_id === carId && r.avg_price)
      .sort((a, b) => b.date.localeCompare(a.date));
    return carPrices[0]?.avg_price || null;
  };

  const getPriceChange = (carId: string): number | null => {
    const carPrices = priceHistory
      .filter((r) => r.car_id === carId && r.avg_price)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (carPrices.length < 2) return null;
    return (carPrices[0].avg_price || 0) - (carPrices[1].avg_price || 0);
  };

  const handleCardClick = (car: Car) => {
    setSelectedCar(car);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedCar(null), 300);
  };

  return (
    <>
      <Header
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        dataSource={dataSource}
        refreshError={refreshError}
      />

      <main className="main-container">
        {/* Cars Grid */}
        <section>
          <h2 className="section-title animate-fade-in">
            🏆 Топ-10 машин для первого авто
          </h2>

          {loading ? (
            <div className="cars-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : (
            <div className="cars-grid">
              {cars.map((car, index) => (
                <CarCard
                  key={car.id}
                  car={car}
                  latestPrice={getLatestPrice(car.id)}
                  priceChange={getPriceChange(car.id)}
                  onClick={() => handleCardClick(car)}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>

        {/* Price Chart */}
        {!loading && <PriceChart cars={cars} priceHistory={priceHistory} />}
      </main>

      {/* Modal */}
      <CarModal
        car={selectedCar}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
