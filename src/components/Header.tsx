'use client';

import { useState } from 'react';

interface HeaderProps {
  lastUpdated: string | null;
  onRefresh: () => Promise<void>;
  dataSource?: 'mock' | 'supabase';
}

export default function Header({ lastUpdated, onRefresh, dataSource = 'mock' }: HeaderProps) {
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="header-title">CarFinder KZ 🚗</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                dataSource === 'supabase'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dataSource === 'supabase'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              {dataSource === 'supabase' ? 'База данных (Реальные)' : 'Демо-режим (Мок)'}
            </span>
          </div>
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
