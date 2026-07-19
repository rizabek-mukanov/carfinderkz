# Ежедневные цены в Telegram

Каждый день в **05:00 UTC** (10:00 Алматы) Vercel Cron вызывает  
`GET /api/prices/scrape`: обновляет цены и шлёт отчёт в Telegram.

## 1. Создать бота

1. Открой [@BotFather](https://t.me/BotFather) в Telegram.
2. Команда `/newbot` → имя и username.
3. Скопируй **token** (вид: `7123456789:AAH...`).

## 2. Узнать свой chat id

1. Напиши боту любое сообщение (например `/start`).
2. Открой в браузере:

```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

3. В ответе найди `"chat":{"id": 123456789` — это **TELEGRAM_CHAT_ID**.  
   Для личного чата id — число; для группы часто отрицательное.

Альтернатива: бот [@userinfobot](https://t.me/userinfobot).

## 3. Переменные окружения

### Локально (`.env.local`)

```env
TELEGRAM_BOT_TOKEN=7123456789:AAH...
TELEGRAM_CHAT_ID=123456789
```

### На Vercel

Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `TELEGRAM_BOT_TOKEN` | токен от BotFather |
| `TELEGRAM_CHAT_ID` | твой chat id |
| `CRON_SECRET` | (рекомендуется) случайная строка |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

После добавления — **Redeploy**.

## 4. Проверка

Локально (dev-сервер + env):

```bash
npm run dev
# в другом терминале:
curl "http://localhost:3000/api/prices/scrape"
```

Или CLI-скрапер:

```bash
npm run scrape
```

Ожидаемый JSON: `"telegram": { "ok": true }`, сообщение в чате с ботом.

## 5. Формат отчёта

- **Новые цены** — если по модели ещё не было истории  
- **Выросли / Упали** — дельта в ₸ и %  
- **Все средние цены** — полный список  
- Среднее изменение по рынку

## 6. Cron

См. `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/prices/scrape",
      "schedule": "0 5 * * *"
    }
  ]
}
```

Cron на Vercel доступен на **Hobby** (1 job/day) и выше.  
Если `CRON_SECRET` задан, Vercel шлёт `Authorization: Bearer <CRON_SECRET>`.

Ручной вызов с секретом:

```
https://your-app.vercel.app/api/prices/scrape?secret=YOUR_CRON_SECRET
```
