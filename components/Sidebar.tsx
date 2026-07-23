'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSidebar } from '@/lib/sidebarContext';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/numbers', label: 'Virtual Numbers', icon: '📱' },
  { href: '/smm', label: 'SMM Panel', icon: '📈' },
  { href: '/accounts', label: 'Buy Accounts', icon: '👤' },
  { href: '/logs', label: 'Buy Logs', icon: '🗂️' },
  { href: '/catalog', label: 'My Catalog', icon: '📦' },
  { href: '/cart', label: 'Cart', icon: '🛒' },
  { href: '/fund', label: 'Fund Wallet', icon: '💰' },
  { href: '/orders', label: 'My Orders', icon: '🧾' },
  { href: '/history', label: 'Transaction History', icon: '📜' },
  { href: '/settings', label: 'Account Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();

  // Prevent background scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const NavLinks = () => (
    <nav className="flex flex-col space-y-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
              active
                ? 'bg-orange-50 text-[#f97316] font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#f97316]'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile drawer + overlay - only rendered while open */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80%] bg-white h-full p-4 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-500 text-sm">MENU</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>
            <NavLinks />
          </div>
        </div>
      )}

      {/* Desktop sidebar - unchanged behavior */}
      <aside className="hidden md:block md:w-64 bg-white border-r border-gray-200 p-6 md:min-h-screen">
        <NavLinks />
      </aside>
    </>
  );
}
