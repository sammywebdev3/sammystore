'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

// Simple emoji glyphs per main category - avoids pulling in real platform
// logos (trademark/licensing risk) while still giving each tile a quick
// visual anchor, same idea as accszone's category icons.
const CATEGORY_ICONS: Record<string, string> = {
  Facebook: '📘',
  Instagram: '📷',
  Twitter: '🐦',
  'Twitter/X': '🐦',
  X: '🐦',
  TikTok: '🎵',
  Gmail: '📧',
  Google: '📧',
  Threads: '🧵',
  'Truth Social': '📢',
  Roblox: '🎮',
  Discord: '🎧',
  Snapchat: '👻',
  LinkedIn: '💼',
  Reddit: '👽',
  Telegram: '✈️',
  YouTube: '▶️',
  Pinterest: '📌',
  Tinder: '❤️',
  Yahoo: '🟣',
  Outlook: '📨',
  Twitch: '🎥',
  Yandex: '🔍',
  Yelp: '⭐',
  Walmart: '🛒',
  Other: '📦',
};

function iconFor(name: string) {
  const key = Object.keys(CATEGORY_ICONS).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  return key ? CATEGORY_ICONS[key] : '📦';
}

export default function LogsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-level nav state: which main category (e.g. "Facebook") is open.
  // null = show the category grid (the home view).
  const [activeMainCategory, setActiveMainCategory] = useState<string | null>(null);
  // Within a main category, which subcategory pill is selected. 'All' = show all.
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/logs/products');
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Main categories, each with an item count - this is the "home" grid,
  // replacing the old wall-of-pills with accszone-style category tiles.
  const mainCategories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const key = p.mainCategory || p.category || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Subcategory pills shown once a main category is opened.
  const subcategories = useMemo(() => {
    if (!activeMainCategory) return [];
    const set = new Set<string>();
    products
      .filter((p) => (p.mainCategory || p.category || 'Other') === activeMainCategory)
      .forEach((p) => set.add(p.category || 'Other'));
    return ['All', ...Array.from(set).sort()];
  }, [products, activeMainCategory]);

  // Search bypasses category navigation entirely and matches by title,
  // same as the persistent search bar on accszone.com.
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return products.filter((p) => (p.name || p.title || '').toLowerCase().includes(q));
  }, [products, search]);

  const visibleProducts = useMemo(() => {
    let list: any[];
    if (searchResults !== null) {
      list = searchResults;
    } else if (activeMainCategory) {
      list = products.filter((p) => (p.mainCategory || p.category || 'Other') === activeMainCategory);
      if (activeSubcategory !== 'All') {
        list = list.filter((p) => (p.category || 'Other') === activeSubcategory);
      }
    } else {
      list = [];
    }
    if (inStockOnly) {
      list = list.filter((p) => p.stock === null || p.stock === undefined || p.stock > 0);
    }
    return list;
  }, [products, activeMainCategory, activeSubcategory, inStockOnly, searchResults]);

  const openCategory = (name: string) => {
    setActiveMainCategory(name);
    setActiveSubcategory('All');
  };

  const goHome = () => {
    setActiveMainCategory(null);
    setActiveSubcategory('All');
    setSearch('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Buy Logs</h1>
            <p className="text-gray-600">Premium verified logs & digital accounts (HStora)</p>
          </div>

          {/* Persistent search - works regardless of which category is open */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for accounts, services..."
              className="input-field w-full md:max-w-md"
            />
          </div>

          {/* Breadcrumb - only shown once inside a category (and search is empty) */}
          {!search.trim() && activeMainCategory && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <button onClick={goHome} className="hover:text-[#f97316] font-semibold">
                Home
              </button>
              <span>›</span>
              <span className="text-gray-700 font-semibold">{activeMainCategory}</span>
            </div>
          )}

          {search.trim() && (
            <p className="text-sm text-gray-500 mb-4">
              {searchResults?.length || 0} result{searchResults?.length === 1 ? '' : 's'} for "{search}"
            </p>
          )}

          {/* HOME VIEW: category grid, replaces the old flat pill wall */}
          {!search.trim() && !activeMainCategory && (
            <>
              {mainCategories.length === 0 ? (
                <p className="text-gray-600 mb-8">No products available right now.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {mainCategories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => openCategory(cat.name)}
                      className="card p-5 text-left hover:border-[#f97316] border-2 border-transparent transition-all"
                    >
                      <div className="text-3xl mb-2">{iconFor(cat.name)}</div>
                      <h3 className="font-bold text-gray-800 mb-1">{cat.name}</h3>
                      <p className="text-sm text-gray-500">{cat.count.toLocaleString()} listing{cat.count === 1 ? '' : 's'}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* CATEGORY / SEARCH VIEW: subcategory pills (category view only) + product grid */}
          {(search.trim() || activeMainCategory) && (
            <>
              {!search.trim() && subcategories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setActiveSubcategory(sub)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        activeSubcategory === sub
                          ? 'bg-[#f97316] text-white'
                          : 'bg-white text-gray-600 border border-gray-300 hover:border-[#f97316]'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#f97316]"
                  />
                  Show only in-stock products
                </label>
                {(activeSubcategory !== 'All' || inStockOnly) && (
                  <button
                    onClick={() => {
                      setActiveSubcategory('All');
                      setInStockOnly(false);
                    }}
                    className="text-sm font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {visibleProducts.length === 0 ? (
                <p className="text-gray-600 mb-8">No products match the selected filters.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {visibleProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/logs/${product.id}`}
                      className={`card p-6 cursor-pointer transition-all border-2 border-transparent hover:border-[#f97316] block relative ${
                        product.stock === 0 ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {product.category && (
                          <span className="inline-block text-xs font-semibold text-[#f97316] bg-primary-50 px-2 py-1 rounded-full">
                            {product.category}
                          </span>
                        )}
                        {product.source === 'local' && (
                          <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            IN HOUSE
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {product.name || product.title}
                      </h3>
                      <p className="text-2xl font-bold text-[#f97316] mb-2">
                        ₦{parseFloat(product.price || '0').toLocaleString()}
                      </p>
                      {product.stock === 0 ? (
                        <p className="text-sm font-semibold text-red-600">Out of Stock</p>
                      ) : product.stock !== null && product.stock !== undefined ? (
                        <p className="text-sm text-gray-600">{product.stock.toLocaleString()} available</p>
                      ) : (
                        <p className="text-sm text-gray-400">Stock unknown</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
