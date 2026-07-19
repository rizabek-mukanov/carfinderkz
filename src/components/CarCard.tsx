'use client';

import { Car } from '@/lib/types';

interface CarCardProps {
  car: Car;
  latestPrice: number | null;
  priceChange: number | null;
  onClick: () => void;
  index: number;
}

function formatPrice(price: number): string {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
}

export default function CarCard({ car, latestPrice, priceChange, onClick, index }: CarCardProps) {
  const displayPrice = latestPrice || (car.priceRange.min + car.priceRange.max) / 2;

  const trendClass = priceChange
    ? priceChange > 0
      ? 'trend-up'
      : priceChange < 0
        ? 'trend-down'
        : 'trend-stable'
    : 'trend-stable';

  const trendText = priceChange
    ? priceChange > 0
      ? `↑ ${formatPrice(Math.abs(priceChange))}`
      : priceChange < 0
        ? `↓ ${formatPrice(Math.abs(priceChange))}`
        : '→ стабильно'
    : '→ нет данных';

  return (
    <div
      className="car-card animate-slide-up"
      onClick={onClick}
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="car-card-image-container">
        <img
          src={car.imageUrl}
          alt={`${car.brand} ${car.model}`}
          className="car-card-image"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.style.background = `linear-gradient(135deg, ${car.color}22, ${car.color}44)`;
              parent.style.display = 'flex';
              parent.style.alignItems = 'center';
              parent.style.justifyContent = 'center';
              parent.style.fontSize = '2.5rem';
              parent.style.fontWeight = '800';
              parent.style.color = car.color;
              parent.textContent = `${car.brand[0]}${car.model[0]}`;
            }
          }}
        />
        <span className={`car-card-badge ${car.bodyType}`}>
          {car.bodyType === 'sedan' ? 'Седан' : 'Кроссовер'}
        </span>
      </div>
      <div className="car-card-body">
        <div className="car-card-name">
          {car.brand} {car.model}
        </div>
        <div className="car-card-years">
          {car.yearFrom}–{car.yearTo} · {car.engine} · {car.transmission.split(' ')[0]}
        </div>
        <div className="car-card-price-row">
          <span className="car-card-price" style={{ color: car.color }}>
            {formatPrice(displayPrice)}
          </span>
          <span className={`car-card-trend ${trendClass}`}>
            {trendText}
          </span>
        </div>
      </div>
    </div>
  );
}
