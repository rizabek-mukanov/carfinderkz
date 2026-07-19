/**
 * Daily price report as PNG infographic (for Telegram).
 * Uses next/og (Satori + resvg) with Noto Sans for Cyrillic.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { formatTenge, type PriceChange } from '@/lib/price-report';

const WIDTH = 1080;
const ROW_H = 78;
const HEADER_H = 260;
const FOOTER_H = 72;

let fontRegular: ArrayBuffer | null = null;
let fontBold: ArrayBuffer | null = null;

async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[]
> {
  if (!fontRegular || !fontBold) {
    const dir = join(process.cwd(), 'src/assets/fonts');
    const [regular, bold] = await Promise.all([
      readFile(join(dir, 'NotoSans-Regular.ttf')),
      readFile(join(dir, 'NotoSans-Bold.ttf')),
    ]);
    fontRegular = regular.buffer.slice(
      regular.byteOffset,
      regular.byteOffset + regular.byteLength
    );
    fontBold = bold.buffer.slice(
      bold.byteOffset,
      bold.byteOffset + bold.byteLength
    );
  }

  return [
    { name: 'Noto Sans', data: fontRegular!, weight: 400, style: 'normal' },
    { name: 'Noto Sans', data: fontBold!, weight: 700, style: 'normal' },
  ];
}

function formatDeltaShort(c: PriceChange): string {
  if (c.delta == null || c.delta_pct == null) return 'новая цена';
  if (c.delta === 0) return 'без изменений';
  const sign = c.delta > 0 ? '+' : '';
  return `${sign}${formatTenge(c.delta)}  (${sign}${c.delta_pct.toFixed(1)}%)`;
}

function arrowFor(c: PriceChange): string {
  if (c.delta == null) return '•';
  if (c.delta > 0) return '↑';
  if (c.delta < 0) return '↓';
  return '→';
}

function colorFor(c: PriceChange): string {
  if (c.delta == null) return '#94A3B8';
  if (c.delta > 0) return '#F87171';
  if (c.delta < 0) return '#4ADE80';
  return '#94A3B8';
}

function buildCaption(changes: PriceChange[], date: string): string {
  const rose = changes.filter((c) => c.delta != null && c.delta > 0).length;
  const fell = changes.filter((c) => c.delta != null && c.delta < 0).length;
  const withDelta = changes.filter((c) => c.delta != null);
  let avgLine = '';
  if (withDelta.length > 0) {
    const avg =
      withDelta.reduce((s, c) => s + (c.delta ?? 0), 0) / withDelta.length;
    avgLine = ` · ср. ${avg >= 0 ? '+' : ''}${formatTenge(avg)}`;
  }
  return `<b>🚗 Car Finder — цены за ${date}</b>\n↑${rose}  ↓${fell}${avgLine}`;
}

/**
 * Render price changes to a PNG buffer suitable for Telegram sendPhoto.
 */
export async function renderPriceInfographic(
  changes: PriceChange[],
  date: string
): Promise<{ png: Buffer; caption: string }> {
  const fonts = await loadFonts();

  const rose = changes.filter((c) => c.delta != null && c.delta > 0).length;
  const fell = changes.filter((c) => c.delta != null && c.delta < 0).length;
  const same = changes.filter((c) => c.delta === 0).length;
  const first = changes.filter((c) => c.previous_price == null).length;

  const withDelta = changes.filter((c) => c.delta != null);
  const avgDelta =
    withDelta.length > 0
      ? withDelta.reduce((s, c) => s + (c.delta ?? 0), 0) / withDelta.length
      : null;

  // Sort: biggest movers first, then alpha
  const sorted = [...changes].sort((a, b) => {
    const da = Math.abs(a.delta ?? 0);
    const db = Math.abs(b.delta ?? 0);
    if (db !== da) return db - da;
    return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'ru');
  });

  const height = Math.min(
    2200,
    HEADER_H + sorted.length * ROW_H + FOOTER_H + 24
  );

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(165deg, #0B1220 0%, #111827 45%, #0F172A 100%)',
          color: '#F8FAFC',
          fontFamily: 'Noto Sans',
          padding: '40px 44px 28px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  color: '#94A3B8',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Car Finder
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 42,
                  fontWeight: 700,
                  marginTop: 6,
                  color: '#F8FAFC',
                }}
              >
                Цены на авто
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 26,
                  color: '#CBD5E1',
                  marginTop: 4,
                }}
              >
                {date} · Алматы
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: 16,
                padding: '14px 20px',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 16,
                  color: '#94A3B8',
                  marginBottom: 4,
                }}
              >
                Среднее изм.
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    avgDelta == null
                      ? '#94A3B8'
                      : avgDelta > 0
                        ? '#F87171'
                        : avgDelta < 0
                          ? '#4ADE80'
                          : '#E2E8F0',
                }}
              >
                {avgDelta == null
                  ? '—'
                  : `${avgDelta >= 0 ? '+' : ''}${formatTenge(avgDelta)}`}
              </div>
            </div>
          </div>

          {/* Summary chips */}
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              gap: 12,
            }}
          >
            <Chip label={`↑ выросли ${rose}`} color="#F87171" bg="#450A0A" />
            <Chip label={`↓ упали ${fell}`} color="#4ADE80" bg="#052E16" />
            <Chip label={`→ без изм. ${same}`} color="#94A3B8" bg="#1E293B" />
            {first > 0 ? (
              <Chip label={`новые ${first}`} color="#38BDF8" bg="#0C4A6E" />
            ) : null}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            height: 1,
            background: '#334155',
            marginBottom: 12,
            width: '100%',
          }}
        />

        {/* Rows */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          {sorted.map((c, i) => {
            const accent = colorFor(c);
            return (
              <div
                key={c.car_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: ROW_H,
                  padding: '0 16px',
                  marginBottom: 6,
                  borderRadius: 14,
                  background:
                    i % 2 === 0
                      ? 'rgba(30, 41, 59, 0.55)'
                      : 'rgba(15, 23, 42, 0.35)',
                  borderLeft: `5px solid ${accent}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 44,
                    fontSize: 28,
                    fontWeight: 700,
                    color: accent,
                    justifyContent: 'center',
                  }}
                >
                  {arrowFor(c)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    marginLeft: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 26,
                      fontWeight: 700,
                      color: '#F1F5F9',
                    }}
                  >
                    {c.brand} {c.model}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 18,
                      color: accent,
                      marginTop: 2,
                    }}
                  >
                    {formatDeltaShort(c)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 26,
                      fontWeight: 700,
                      color: '#F8FAFC',
                    }}
                  >
                    {formatTenge(c.avg_price)}
                  </div>
                  {c.previous_price != null ? (
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 16,
                        color: '#64748B',
                        marginTop: 2,
                      }}
                    >
                      было {formatTenge(c.previous_price)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 14,
            borderTop: '1px solid #334155',
            fontSize: 18,
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex' }}>kolesa.kz · средние цены</div>
          <div style={{ display: 'flex' }}>goofy-bose · daily report</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height,
      fonts,
      emoji: 'twemoji',
    }
  );

  const png = Buffer.from(await response.arrayBuffer());
  return { png, caption: buildCaption(changes, date) };
}

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: bg,
        color,
        fontSize: 20,
        fontWeight: 700,
        padding: '10px 16px',
        borderRadius: 999,
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </div>
  );
}
