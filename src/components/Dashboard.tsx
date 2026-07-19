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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
        const pricesData = await pricesRes.json();
        setPriceHistory(pricesData);
        if (pricesData.length > 0) {
          const latestDate = pricesData.reduce(
            (max: string, r: PriceRecord) => (r.date > max ? r.date : max),
            pricesData[0].date
          );
          setLastUpdated(latestDate);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/prices/scrape', { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
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
      <Header lastUpdated={lastUpdated} onRefresh={handleRefresh} />

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
