'use client';

import { useEffect, useState } from 'react';

interface Announcement {
  _id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

const SEVERITY_STYLE: Record<Announcement['severity'], string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
};

const SEVERITY_ICON: Record<Announcement['severity'], string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
};

const DISMISSED_KEY = 'dismissedAnnouncements';

// Shows every currently-active admin broadcast at the top of the site,
// for logged-in and logged-out visitors alike. Each one can be dismissed
// individually; the dismissal is remembered per-browser (localStorage) so
// it won't keep reappearing, but reappears again if the admin posts a new
// one (different id) or the user clears storage.
export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const load = async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      if (data.success && Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      }
    } catch {
      // silent - a banner failing to load shouldn't break the page
    }
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
      if (Array.isArray(stored)) setDismissed(stored);
    } catch {
      // ignore malformed storage
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures (e.g. private browsing quota)
    }
  };

  const visible = announcements.filter((a) => !dismissed.includes(a._id));
  if (visible.length === 0) return null;

  return (
    <div className="sticky top-0 z-[60] flex flex-col gap-1 p-2">
      {visible.map((a) => (
        <div
          key={a._id}
          className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm ${SEVERITY_STYLE[a.severity]}`}
        >
          <span className="text-base leading-none">{SEVERITY_ICON[a.severity]}</span>
          <p className="flex-1 font-medium whitespace-pre-wrap">{a.message}</p>
          <button
            onClick={() => dismiss(a._id)}
            aria-label="Dismiss"
            className="text-current opacity-60 hover:opacity-100 transition-opacity font-bold leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
