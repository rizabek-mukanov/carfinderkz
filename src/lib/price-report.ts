/**
 * Build daily price change report for Telegram / logs.
 */

export interface PriceSnapshot {
  car_id: string;
  brand: string;
  model: string;
  avg_price: number;
  min_price?: number | null;
  max_price?: number | null;
  listings_count?: number | null;
  source?: string;
}

export interface PriceChange extends PriceSnapshot {
  previous_price: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export function formatTenge(price: number): string {
  return `${Math.round(price).toLocaleString('ru-RU')} ₸`;
}

export function computePriceChanges(
  current: PriceSnapshot[],
  previousByCarId: Map<string, number>
): PriceChange[] {
  return current.map((row) => {
    const prev = previousByCarId.get(row.car_id) ?? null;
    const delta = prev != null ? row.avg_price - prev : null;
    const delta_pct =
      prev != null && prev !== 0 ? ((row.avg_price - prev) / prev) * 100 : null;

    return {
      ...row,
      previous_price: prev,
      delta,
      delta_pct,
    };
  });
}

function formatDelta(change: PriceChange): string {
  if (change.delta == null || change.delta_pct == null) {
    return 'новый';
  }
  if (change.delta === 0) {
    return 'без изменений';
  }
  const sign = change.delta > 0 ? '+' : '';
  return `${sign}${formatTenge(change.delta)} (${sign}${change.delta_pct.toFixed(1)}%)`;
}

/**
 * Human-readable HTML report for Telegram.
 * Telegram HTML supports: <b>, <i>, <code>, <a>, etc.
 */
export function buildTelegramPriceReport(
  changes: PriceChange[],
  date: string
): string {
  const rose = changes.filter((c) => c.delta != null && c.delta > 0);
  const fell = changes.filter((c) => c.delta != null && c.delta < 0);
  const same = changes.filter((c) => c.delta === 0);
  const firstTime = changes.filter((c) => c.previous_price == null);

  const lines: string[] = [
    `<b>🚗 Car Finder — цены за ${date}</b>`,
    '',
  ];

  if (firstTime.length > 0) {
    lines.push('<b>🆕 Новые цены</b>');
    for (const c of firstTime) {
      lines.push(
        `• ${c.brand} ${c.model}: <b>${formatTenge(c.avg_price)}</b>`
      );
    }
    lines.push('');
  }

  if (rose.length > 0) {
    lines.push('<b>📈 Выросли</b>');
    for (const c of rose.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))) {
      lines.push(
        `• ${c.brand} ${c.model}: ${formatTenge(c.previous_price!)} → <b>${formatTenge(c.avg_price)}</b> (${formatDelta(c)})`
      );
    }
    lines.push('');
  }

  if (fell.length > 0) {
    lines.push('<b>📉 Упали</b>');
    for (const c of fell.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))) {
      lines.push(
        `• ${c.brand} ${c.model}: ${formatTenge(c.previous_price!)} → <b>${formatTenge(c.avg_price)}</b> (${formatDelta(c)})`
      );
    }
    lines.push('');
  }

  if (same.length > 0 && rose.length + fell.length + firstTime.length > 0) {
    lines.push(`➡️ Без изменений: ${same.map((c) => c.model).join(', ')}`);
    lines.push('');
  }

  // Full list always useful
  lines.push('<b>📊 Все средние цены</b>');
  for (const c of changes) {
    const arrow =
      c.delta == null
        ? '•'
        : c.delta > 0
          ? '↑'
          : c.delta < 0
            ? '↓'
            : '→';
    lines.push(
      `${arrow} ${c.brand} ${c.model}: <b>${formatTenge(c.avg_price)}</b>`
    );
  }

  const withDelta = changes.filter((c) => c.delta != null);
  if (withDelta.length > 0) {
    const avgDelta =
      withDelta.reduce((s, c) => s + (c.delta ?? 0), 0) / withDelta.length;
    lines.push('');
    lines.push(
      `Среднее изменение: <b>${avgDelta >= 0 ? '+' : ''}${formatTenge(avgDelta)}</b>`
    );
  }

  return lines.join('\n');
}
