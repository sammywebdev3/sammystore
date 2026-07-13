'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

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
    <nav className="w-full bg-[#0f0f16] border-b border-[#2a2a3a] p-4 flex justify-between items-center sticky top-0 z-50">
      <Link href="/dashboard" className="text-2xl font-bold font-mono">
        <span className="text-[#e11d3f]">SAMMY</span>
        <span className="text-[#8c0018]">STORE</span>
      </Link>

      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts & SMM services..."
          className="w-full px-3 py-1.5 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] text-sm text-[#e0e0e0] placeholder-[#5a5a6a] focus:outline-none focus:border-[#e11d3f]/50 transition-colors"
        />
      </form>

      <div className="flex items-center gap-4">
        <Link
          href="/search"
          className="md:hidden p-2 rounded-lg hover:bg-[#1a1a25] transition-colors"
          aria-label="Search"
        >
          <span className="text-xl">🔍</span>
        </Link>
        {balance !== null && (
          <Link
            href="/fund"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] text-sm font-mono hover:border-[#e11d3f]/50 transition-colors"
          >
            <span className="text-[#a0a0b0]">Wallet</span>
            <span className="text-[#e11d3f] font-bold">₦{balance.toLocaleString()}</span>
          </Link>
        )}
        <Link
          href="/cart"
          className="relative p-2 rounded-lg hover:bg-[#1a1a25] transition-colors"
          aria-label="Cart"
        >
          <span className="text-xl">🛒</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#e11d3f] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>
        <ThemeToggle />
        <Link
          href="/dashboard"
          className={`text-sm font-mono transition-colors ${
            pathname === '/dashboard' ? 'text-[#e11d3f]' : 'text-[#a0a0b0] hover:text-[#e11d3f]'
          }`}
        >
          DASHBOARD
        </Link>
      </div>
    </nav>
  );
}
