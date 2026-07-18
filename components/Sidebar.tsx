'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/services', label: 'Browse All' },
  { href: '/numbers', label: 'Virtual Numbers' },
  { href: '/smm', label: 'SMM Panel' },
  { href: '/accounts', label: 'Buy Accounts' },
  { href: '/logs', label: 'Buy Logs' },
  { href: '/catalog', label: 'My Catalog' },
  { href: '/cart', label: 'Cart' },
  { href: '/fund', label: 'Fund Wallet' },
  { href: '/orders', label: 'My Orders' },
  { href: '/history', label: 'Transaction History' },
  { href: '/settings', label: 'Account Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    // Hidden on mobile - BottomNav covers primary navigation there, so this
    // full link list no longer stacks above every page's content on phones.
    <aside className="hidden md:block md:w-64 bg-white border-r border-gray-200 p-6 md:min-h-screen">
      <nav className="flex flex-col space-y-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                active
                  ? 'bg-orange-50 text-[#f97316] font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#f97316]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
