'use client';

import { useEffect, useCallback } from 'react';
import { Car } from '@/lib/types';

interface CarModalProps {
  car: Car | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatPrice(price: number): string {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
}

export default function CarModal({ car, isOpen, onClose }: CarModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !car) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <img
          src={car.imageUrl}
          alt={`${car.brand} ${car.model}`}
          className="modal-image"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.background = `linear-gradient(135deg, ${car.color}33, ${car.color}66)`;
            target.style.objectFit = 'contain';
          }}
        />

        <div className="modal-body">
          <h2 className="modal-title">
            {car.brand} {car.model}
          </h2>
          <p className="modal-meta">
            {car.yearFrom}–{car.yearTo} · {car.engine} · {car.transmission} ·{' '}
            {car.bodyType === 'sedan' ? 'Седан' : 'Кроссовер'}
          </p>
          <p className="modal-price-range">
            {formatPrice(car.priceRange.min)} – {formatPrice(car.priceRange.max)}
          </p>

          <p className="modal-description">{car.description}</p>

          {/* Pros */}
          <div className="modal-section">
            <h3 className="modal-section-title">
              <span>✅</span> Плюсы
            </h3>
            <ul className="modal-list pros">
              {car.pros.map((pro, i) => (
                <li key={i}>{pro}</li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="modal-section">
            <h3 className="modal-section-title">
              <span>❌</span> Минусы
            </h3>
            <ul className="modal-list cons">
              {car.cons.map((con, i) => (
                <li key={i}>{con}</li>
              ))}
            </ul>
          </div>

          {/* Why first car */}
          <div className="modal-highlight">
            <h3 className="modal-highlight-title">
              <span>🎯</span> Почему подойдёт как первая машина
            </h3>
            <p className="modal-highlight-text">{car.whyFirstCar}</p>
          </div>

          {/* Links */}
          <div className="modal-links">
            <a
              href={car.searchUrls.kolesa}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-link kolesa"
            >
              🔍 Смотреть на Kolesa.kz
            </a>
            <a
              href={car.searchUrls.mycar}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-link mycar"
            >
              🔍 Смотреть на Mycar.kz
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
