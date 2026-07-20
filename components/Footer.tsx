import Logo from '@/components/Logo';

const TELEGRAM_URL = 'https://t.me/sammystorelogss';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8Zqpg4SpkOr8Ghme0w';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
          <Logo variant="stacked" />
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center sm:items-start gap-2">
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} SammyStore. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</a>
              <a href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
              <a href="/refund-policy" className="hover:text-gray-700 transition-colors">Refund Policy</a>
              <a href="/faq" className="hover:text-gray-700 transition-colors">How to Buy / FAQ</a>
            </div>
          </div>
        <div className="flex items-center gap-4">
            <a
              href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#229ED9] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M22.05 3.53 2.7 11.1c-1.32.53-1.32 1.28-.24 1.61l4.94 1.54 11.4-7.19c.54-.33 1.03-.15.63.21L10.5 15.2h-.01l.35 5.05c.5 0 .72-.23.99-.5l2.38-2.31 4.94 3.65c.91.5 1.56.24 1.79-.84l3.24-15.25c.33-1.33-.5-1.93-1.13-1.47z" />
            </svg>
            Telegram
          </a>
            <a
              href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#25d366] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.17-3.14.82.84-3.06-.19-.32a8.16 8.16 0 0 1-1.26-4.37c0-4.54 3.7-8.22 8.25-8.22M8.4 6.85c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.7 2.72 4.19 3.71 2.07.82 2.49.66 2.94.62.45-.04 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.71-1.67-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.35-.76-1.84-.2-.48-.4-.42-.55-.42h-.35z" />
            </svg>
            WhatsApp Channel
          </a>
        </div>
      </div>
          </div>
    </footer>
  );
}
