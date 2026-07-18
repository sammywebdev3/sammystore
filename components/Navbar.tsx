'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.balance === 'number') setBalance(data.balance);
      })
      .catch(() => {});

    fetch('/api/cart', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.items)) {
          setCartCount(data.items.reduce((sum: number, i: any) => sum + i.quantity, 0));
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <nav className="w-full bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="SammyStore home">
        <Logo />
      </Link>

      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts & SMM services..."
          className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#f97316]/50 transition-colors"
        />
      </form>

      <div className="flex items-center gap-4">
        <Link
          href="/search"
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Search"
        >
          <span className="text-xl">🔍</span>
        </Link>
        {balance !== null && (
          <Link
            href="/fund"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm hover:border-[#f97316]/50 transition-colors"
          >
            <span className="text-gray-500">Wallet</span>
            <span className="text-[#f97316] font-bold">₦{balance.toLocaleString()}</span>
          </Link>
        )}
        <Link
          href="/cart"
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Cart"
        >
          <span className="text-xl">🛒</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#f97316] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>
        <Link
          href="/settings"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Account settings"
        >
          <span className="text-xl">⚙️</span>
        </Link>
        <Link
          href="/dashboard"
          className={`p-2 rounded-lg transition-colors ${
            pathname === '/dashboard' ? 'bg-orange-50 text-[#f97316]' : 'text-gray-500 hover:bg-gray-100 hover:text-[#f97316]'
          }`}
          aria-label="Dashboard"
        >
          <span className="text-xl">🏠</span>
        </Link>
      </div>
    </nav>
  );
}
