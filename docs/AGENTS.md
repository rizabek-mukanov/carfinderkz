# Goofy-Bose / Car Finder — гайд для агентов

Документ для людей и AI-агентов: что это за проект, как устроен, куда класть изменения.

## Что это

**Car Finder** — веб-дашборд цен на популярные авто в Казахстане (Алматы).

- **UI**: карточки машин, модалка с деталями, график цен, кнопка «Обновить цены».
- **Данные**: скрейп `kolesa.kz` (+ fallback-генерация, если скрейп пустой), история в **Supabase**.
- **Алерты**: ежедневный cron → сравнение с прошлым днём → **Telegram** (PNG-инфографика + HTML-текст).

Стек: **Next.js 16** (App Router), React 19, Tailwind 4, Supabase JS, Vercel Cron, Telegram Bot API.

> ⚠️ Это **не** «классический» Next.js из старых туториалов. Перед правками смотри `node_modules/next/dist/docs/` и корневой `AGENTS.md`.

---

## Карта репозитория

```
src/
  app/
    page.tsx                 # главная (Dashboard)
    layout.tsx, globals.css
    api/
      cars/route.ts          # список машин
      prices/route.ts        # история цен из Supabase
      prices/scrape/route.ts # скрейп + сохранение + Telegram (cron + UI)
  components/
    Dashboard.tsx, Header.tsx, CarCard.tsx, CarModal.tsx, PriceChart.tsx
  lib/
    cars-data.ts             # статический каталог машин (источник правды по моделям)
    types.ts
    supabase.ts              # клиент (null, если env не задан)
    price-report.ts          # дельты + HTML-текст отчёта
    price-infographic.tsx    # PNG-инфографика (next/og + Noto Sans)
    telegram.ts              # sendMessage / sendPhoto
  scraper/
    scrape.ts                # CLI-скрапер (npm run scrape)
    test-db.ts
  assets/fonts/              # NotoSans Regular/Bold (кириллица для PNG)
public/cars/                 # фото машин
docs/
  TELEGRAM_SETUP.md          # настройка бота и env
  AGENTS.md                  # этот файл
vercel.json                  # cron: GET /api/prices/scrape @ 05:00 UTC
```

---

## Потоки данных

### 1. Дашборд

1. Клиент грузит машины (`/api/cars` или `cars-data`) и историю (`/api/prices`).
2. «Обновить цены» → **POST** `/api/prices/scrape` (без секрета; см. auth ниже).
3. UI показывает `scrapedAt` в **Asia/Almaty**.

### 2. Ежедневный scrape + Telegram

1. Vercel Cron (`vercel.json`): `0 5 * * *` → `GET /api/prices/scrape` (10:00 Алматы).
2. Для каждой машины из `cars-data`:
   - live HTML с kolesa.kz (если `SCRAPE_LIVE` ≠ `0` и `?live` ≠ `0`);
   - иначе / при &lt;3 ценах — fallback вокруг base price.
3. Upsert в Supabase `price_history` (`car_id, date, source`).
4. Загрузка предыдущих `avg_price` → `computePriceChanges`.
5. Telegram (если env задан):
   - **PNG** через `renderPriceInfographic` → `sendTelegramPhoto` (caption-сводка);
   - **текст** через `buildTelegramPriceReport` → `sendTelegramMessage` (полный HTML).

### 3. Auth scrape endpoint

| Условие | Доступ |
|--------|--------|
| `CRON_SECRET` не задан | открыто |
| Заголовок `x-vercel-cron: 1` | ок |
| `Authorization: Bearer <CRON_SECRET>` или `?secret=` | ок |
| **POST** (кнопка UI) | ок |
| `CRON_AUTH_STRICT=1` | всё остальное режется |

---

## Переменные окружения

| Имя | Назначение |
|-----|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `TELEGRAM_BOT_TOKEN` | токен @BotFather |
| `TELEGRAM_CHAT_ID` | chat id (личный / группа) |
| `CRON_SECRET` | опциональная защита scrape |
| `CRON_AUTH_STRICT` | `1` = жёсткий режим auth |
| `SCRAPE_LIVE` | `0` = только fallback-цены |

Локально: `.env.local` (шаблон — `.env.example`).  
Настройка Telegram: `docs/TELEGRAM_SETUP.md`.

---

## Таблица Supabase (ожидаемая)

`price_history`:

- `car_id` (text)
- `date` (date)
- `avg_price`, `min_price`, `max_price` (number)
- `listings_count` (int)
- `source` (`kolesa` | `combined` | …)
- unique / upsert: `(car_id, date, source)`

---

## Где менять типичные вещи

| Задача | Файлы |
|--------|--------|
| Добавить/убрать модель авто | `src/lib/cars-data.ts` + фото в `public/cars/` |
| Текст Telegram-отчёта | `src/lib/price-report.ts` → `buildTelegramPriceReport` |
| Вид PNG-инфографики | `src/lib/price-infographic.tsx` |
| Отправка в Telegram | `src/lib/telegram.ts` |
| Логика scrape / cron / auth | `src/app/api/prices/scrape/route.ts` |
| Расписание cron | `vercel.json` |
| UI дашборда / refresh | `src/components/Dashboard.tsx`, `Header.tsx` |
| Парсинг kolesa | `scrape/route.ts` (`scrapeKolesa`) и/или `src/scraper/scrape.ts` |

---

## Telegram: инфографика

- Генерация: **`next/og` `ImageResponse`** (Satori → PNG).
- Шрифты: `src/assets/fonts/NotoSans-*.ttf` (кириллица обязательна).
- Не класть огромные ассеты в edge-бандл без нужды; scrape route — Node, шрифты читаются с диска через `fs`.
- Caption ≤ 1024 символов; полный отчёт уходит отдельным сообщением.
- При ошибке рендера PNG всё равно пытаемся отправить текстовый отчёт.

Ответ API (фрагмент):

```json
{
  "telegram": {
    "ok": true,
    "photo": true,
    "text": true
  }
}
```

---

## Команды

```bash
npm run dev          # localhost:3000
npm run build        # проверка сборки
npm run scrape       # CLI-скрапер (не тот же путь, что API cron)

# ручной daily pipeline (dev-сервер должен быть запущен):
curl -X POST "http://localhost:3000/api/prices/scrape"
# без live-скрейпа:
curl "http://localhost:3000/api/prices/scrape?live=0"
```

---

## Ограничения и подводные камни

1. **Next.js 16** — не угадывать API; читать `node_modules/next/dist/docs/`.
2. **Serverless timeout** — Hobby ~10s, Pro до 60s (`maxDuration = 60`); скрейп лёгкий, с паузой 400ms между машинами.
3. **kolesa.kz** может отдавать пусто/блок — fallback не должен ломать cron.
4. **Satori CSS** — только flex + ограниченный CSS (нет grid, малое subset).
5. **Секреты** — не коммитить `.env.local`; в ответах API не светить токены.
6. **Время** — cron в UTC; UI «обновлено» в Asia/Almaty.

---

## Чеклист для PR / агента

- [ ] Не ломать auth scrape (POST UI + Vercel cron).
- [ ] Telegram: и photo, и text — graceful degradation.
- [ ] Новые модели — id стабильный (`brand-model`), фото, priceRange.
- [ ] `npm run build` проходит.
- [ ] Обновить этот файл / `TELEGRAM_SETUP.md`, если меняется pipeline или env.

---

## Быстрый контекст для нового чата

> Проект Car Finder: Next.js дашборд цен авто (KZ). Цены скрейпит `/api/prices/scrape`, пишет в Supabase, шлёт в Telegram PNG-инфографику + HTML. Каталог машин — `cars-data.ts`. Документация агента — `docs/AGENTS.md`.
