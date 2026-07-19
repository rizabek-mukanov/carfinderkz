/**
 * Minimal Telegram Bot API helper.
 * Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in env.
 */

const TELEGRAM_API = 'https://api.telegram.org';

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramMessage(
  text: string,
  options?: { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode ?? 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json()) as { ok?: boolean; description?: string };

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Send a PNG (or other image) via sendPhoto.
 * Caption max 1024 chars; use HTML parse mode when caption has tags.
 */
export async function sendTelegramPhoto(
  image: Buffer | Uint8Array,
  options?: {
    caption?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    filename?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' };
  }

  try {
    const form = new FormData();
    form.append('chat_id', chatId);

    // Copy into a plain ArrayBuffer-backed Uint8Array for Blob/FormData typings
    const src = image instanceof Uint8Array ? image : new Uint8Array(image);
    const bytes = new Uint8Array(src.byteLength);
    bytes.set(src);
    const blob = new Blob([bytes], { type: 'image/png' });
    form.append('photo', blob, options?.filename ?? 'price-report.png');

    if (options?.caption) {
      // Telegram caption hard limit
      const caption =
        options.caption.length > 1024
          ? options.caption.slice(0, 1021) + '…'
          : options.caption;
      form.append('caption', caption);
      form.append('parse_mode', options.parseMode ?? 'HTML');
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
    });

    const data = (await res.json()) as { ok?: boolean; description?: string };

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
