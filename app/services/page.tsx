'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

type Tab = 'all' | 'numbers' | 'smm' | 'accounts' | 'logs' | 'catalog';

export default function ServicesCatalogPage() {
  const [tab, setTab] = useState<Tab>('all');

  const [accountProducts, setAccountProducts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [logProducts, setLogProducts] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [smmServices, setSmmServices] = useState<any[]>([]);
  const [smmCategories, setSmmCategories] = useState<string[]>([]);
  const [smmLoading, setSmmLoading] = useState(true);

  useEffect(() => {
    fetch('/api/accounts/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) setAccountProducts(data.products);
      })
      .catch(() => {})
      .finally(() => setAccountsLoading(false));

    fetch('/api/logs/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) setLogProducts(data.products);
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));

    fetch('/api/smm/services')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.services)) {
          setSmmServices(data.services);
          const set = new Set<string>();
          data.services.forEach((s: any) => set.add(s.category || 'Other'));
          setSmmCategories(Array.from(set).sort());
        }
      })
      .catch(() => {})
      .finally(() => setSmmLoading(false));
  }, []);

  // Cheapest rate (per 1000) within each SMM category, so the catalog can
  // show real "from ₦X" pricing instead of a bare list of category names.
  const smmCategoryStartingPrice = useMemo(() => {
    const map: Record<string, number> = {};
    smmServices.forEach((s: any) => {
      const cat = s.category || 'Other';
      const rate = parseFloat(s.rate) || 0;
      if (rate > 0 && (!(cat in map) || rate < map[cat])) map[cat] = rate;
    });
    return map;
  }, [smmServices]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    accountProducts.forEach((p) => set.add(p.category || 'Other'));
    return ['All', ...Array.from(set).sort()];
  }, [accountProducts]);

  const visibleAccountProducts = useMemo(() => {
    if (selectedCategory === 'All') return accountProducts;
    return accountProducts.filter((p) => (p.category || 'Other') === selectedCategory);
  }, [accountProducts, selectedCategory]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'numbers', label: 'Virtual Numbers' },
    { key: 'smm', label: 'SMM' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'logs', label: 'Logs' },
    { key: 'catalog', label: 'My Catalog' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#f97316] mb-4 transition-colors">
            ← Back to Dashboard
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Browse Everything</h1>
            <p className="text-gray-600">Virtual numbers, SMM growth, and verified accounts - one catalog.</p>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  tab === t.key
                    ? 'bg-[#f97316] text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-[#f97316]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(tab === 'all' || tab === 'numbers') && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Virtual Numbers</h2>
                <Link href="/numbers" className="text-[#f97316] text-sm font-semibold">
                  Open →
                </Link>
              </div>
              <div className="card p-6">
                <p className="text-gray-600 text-sm mb-4">
                  Receive SMS from 200+ countries for WhatsApp, Telegram, Instagram, and hundreds more services.
                  Pick a country to see live pricing.
                </p>
                <Link href="/numbers" className="btn-primary inline-block">
                  Choose a country →
                </Link>
              </div>
            </section>
          )}

          {(tab === 'all' || tab === 'smm') && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">SMM Panel</h2>
                <Link href="/smm" className="text-[#f97316] text-sm font-semibold">
                  Open →
                </Link>
              </div>
              {smmLoading ? (
                <div className="card p-6 text-gray-500 text-sm">Loading categories...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {smmCategories.slice(0, tab === 'smm' ? undefined : 10).map((cat) => (
                    <Link
                      key={cat}
                      href={`/smm?category=${encodeURIComponent(cat)}`}
                      className="card px-4 py-2 text-sm text-gray-700 hover:border-[#f97316] border-2 border-transparent"
                    >
                      <span>{cat}</span>
                      {smmCategoryStartingPrice[cat] != null && (
                        <span className="ml-2 text-[#f97316] font-semibold">
                          from ₦{smmCategoryStartingPrice[cat].toLocaleString(undefined, { maximumFractionDigits: 2 })}/1000
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {(tab === 'all' || tab === 'accounts') && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Buy Accounts</h2>
                {tab === 'all' && (
                  <Link href="/accounts" className="text-[#f97316] text-sm font-semibold">
                    Open →
                  </Link>
                )}
              </div>

              {tab === 'accounts' && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        selectedCategory === category
                          ? 'bg-[#f97316] text-white'
                          : 'bg-white text-gray-600 border border-gray-300 hover:border-[#f97316]'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              {accountsLoading ? (
                <div className="card p-6 text-gray-500 text-sm">Loading products...</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(tab === 'accounts' ? visibleAccountProducts : accountProducts.slice(0, 6)).map((product) => (
                    <Link
                      key={product.id}
                      href={`/accounts/${product.id}`}
                      className="card p-6 cursor-pointer transition-all border-2 border-transparent hover:border-[#f97316] block"
                    >
                      {product.category && (
                        <span className="inline-block text-xs font-semibold text-[#f97316] bg-primary-50 px-2 py-1 rounded-full mb-2">
                          {product.category}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{product.name || product.title}</h3>
                      <p className="text-xl font-bold text-[#f97316] mb-1">
                        ₦{parseFloat(product.price || '0').toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(product.stock ?? 0) > 0 || product.stock === undefined
                          ? `${product.stock || 'In Stock'} available`
                          : 'Out of stock'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
          {(tab === 'all' || tab === 'logs') && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Buy Logs</h2>
                <Link href="/logs" className="text-[#f97316] text-sm font-semibold">
                  Open →
                </Link>
              </div>

              {logsLoading ? (
                <div className="card p-6 text-gray-500 text-sm">Loading products...</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(tab === 'logs' ? logProducts : logProducts.slice(0, 6)).map((product) => (
                    <Link
                      key={product.id}
                      href={`/logs/${product.id}`}
                      className="card p-6 cursor-pointer transition-all border-2 border-transparent hover:border-[#f97316] block"
                    >
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{product.name || product.title}</h3>
                      <p className="text-xl font-bold text-[#f97316] mb-1">
                        ₦{parseFloat(product.price || '0').toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(product.stock ?? 0) > 0 || product.stock === undefined
                          ? `${product.stock || 'In Stock'} available`
                          : 'Out of stock'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

        {(tab === 'all' || tab === 'catalog') && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">My Catalog</h2>
                  <Link href="/catalog" className="text-[#f97316] text-sm font-semibold">
                    Open &rarr;
                  </Link>
                </div>
                <div className="card p-6">
                  <p className="text-gray-600 text-sm mb-4">
                    Accounts sold directly by SammyStore &mdash; instant delivery from our own stock.
                  </p>
                  <Link href="/catalog" className="btn-primary inline-block">
                    Browse My Catalog &rarr;
                  </Link>
                </div>
              </section>
            )}
          </main>
      </div>
    </div>
  );
}
