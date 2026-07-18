// Minimal Telegram Bot API wrapper for admin notifications (new ticket /
// new customer reply). Uses fetch directly rather than a package since
// it's one API call - no need for a dependency.
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Telegram sendMessage failed:', res.status, body);
    }
  } catch (e) {
    // Never let a notification failure break the actual ticket flow.
    console.error('Telegram sendMessage error:', e);
  }
}
