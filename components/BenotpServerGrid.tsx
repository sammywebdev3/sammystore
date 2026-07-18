'use client';
import Link from 'next/link';
import type { BenotpPool } from '@/lib/benotp';

interface Props {
  selected: BenotpPool;
  onSelect: (pool: BenotpPool) => void;
}

// Mirrors the reference layout exactly: 2x2 grid of server-pool tiles (the
// active one filled in brand orange, matching how the reference highlights
// its active tile in blue), then two full-width centered tiles for the
// site's existing Accounts and SMM pages, then one large gradient CTA -
// same visual rhythm as the reference's "Click to boost your followers"
// button. The Airtime & Data tile from the reference is intentionally
// omitted per instruction.
export default function BenotpServerGrid({ selected, onSelect }: Props) {
  const tiles: { pool: BenotpPool; icon: string; label: string }[] = [
    { pool: 'usa1', icon: '🇺🇸', label: 'USA Server 1' },
    { pool: 'usa2', icon: '🇺🇸', label: 'USA Server 2' },
    { pool: 'all1', icon: '🌍', label: 'All Countries 1' },
    { pool: 'all2', icon: '🌍', label: 'All Countries 2' },
  ];

  return (
    <div className="card p-6 mb-8">
      <div className="grid grid-cols-2 gap-3 mb-3">
        {tiles.map((t) => {
          const active = selected === t.pool;
          return (
            <button
              key={t.pool}
              onClick={() => onSelect(t.pool)}
              className={`flex items-center gap-2 justify-center py-4 px-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                active
                  ? 'bg-[#f97316] text-white border-[#f97316]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#f97316]'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <Link
        href="/accounts"
        className="flex items-center gap-2 justify-center py-4 px-3 rounded-xl font-semibold text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-[#f97316] transition-all mb-3"
      >
        🛍️ Buy Accounts
      </Link>

      <Link
        href="/logs"
        className="flex items-center gap-2 justify-center py-4 px-3 rounded-xl font-semibold text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-[#f97316] transition-all mb-3"
      >
        📄 Buy Logs
      </Link>

      <Link
        href="/smm"
        className="flex items-center gap-2 justify-center py-4 px-3 rounded-xl font-semibold text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-[#f97316] transition-all mb-5"
      >
        🚀 Boost Your Followers
      </Link>

      <Link
        href="/smm"
        className="flex items-center gap-2 justify-center py-4 px-6 rounded-full font-bold text-white text-base bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:shadow-lg transition-all"
      >
        🚀 Click to boost your followers
      </Link>
    </div>
  );
}
