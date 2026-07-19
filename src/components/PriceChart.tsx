'use client';

import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Car, PriceRecord } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceChartProps {
  cars: Car[];
  priceHistory: PriceRecord[];
}

export default function PriceChart({ cars, priceHistory }: PriceChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="chart-section animate-slide-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
        <h2 className="section-title">📈 История цен</h2>
        <div className="chart-placeholder">
          <span className="chart-placeholder-icon">📊</span>
          <span>Данные появятся после первого обновления цен</span>
        </div>
      </div>
    );
  }

  // Get unique sorted dates
  const dates = [...new Set(priceHistory.map((r) => r.date))].sort();

  // Format dates for display
  const labels = dates.map((d) => {
    const date = new Date(d);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  });

  // Build datasets
  const datasets = cars.map((car) => {
    const carPrices = dates.map((date) => {
      const record = priceHistory.find(
        (r) => r.car_id === car.id && r.date === date
      );
      return record?.avg_price || null;
    });

    return {
      label: `${car.brand} ${car.model}`,
      data: carPrices,
      borderColor: car.color,
      backgroundColor: car.color + '20',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: car.color,
      pointBorderColor: '#0a0a0f',
      pointBorderWidth: 2,
      tension: 0.3,
      fill: false,
      spanGaps: true,
    };
  });

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#a1a1aa',
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 26, 0.95)',
        titleColor: '#e4e4e7',
        bodyColor: '#a1a1aa',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: {
          family: 'Inter, sans-serif',
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 12,
        },
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            if (value === null) return '';
            const formatted = value
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            return `${context.dataset.label}: ${formatted} ₸`;
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#71717a',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
          maxRotation: 45,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#71717a',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
          callback: function (value) {
            const numValue = Number(value);
            if (numValue >= 1000000) {
              return (numValue / 1000000).toFixed(1) + 'M';
            }
            return numValue.toLocaleString('ru-RU');
          },
        },
      },
    },
  };

  return (
    <div className="chart-section animate-slide-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
      <h2 className="section-title">📈 История цен</h2>
      <div className="chart-container">
        <Line ref={chartRef} data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}
