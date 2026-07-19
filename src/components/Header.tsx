'use client';

import { useState } from 'react';

interface HeaderProps {
  lastUpdated: string | null;
  onRefresh: () => Promise<void>;
}

export default function Header({ lastUpdated, onRefresh }: HeaderProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div>
          <h1 className="header-title">CarFinder KZ 🚗</h1>
          <p className="header-subtitle">
            Мониторинг цен на лучшие авто до 10 млн ₸
          </p>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Обновлено: {new Date(lastUpdated).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            <span>
              {loading ? (
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                '🔄'
              )}
            </span>
            <span>{loading ? 'Обновляю...' : 'Обновить цены'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
