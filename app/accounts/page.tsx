'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function AccountsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/accounts/products');
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category || 'Other'));
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'All') {
      list = list.filter((p) => (p.category || 'Other') === selectedCategory);
    }
    if (inStockOnly) {
      list = list.filter((p) => p.stock === null || p.stock === undefined || p.stock > 0);
    }
    return list;
  }, [products, selectedCategory, inStockOnly]);

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
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Buy Accounts</h1>
            <p className="text-gray-600">Premium verified accounts for all platforms</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
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
            {(selectedCategory !== 'All' || inStockOnly) && (
              <button
                onClick={() => {
                  setSelectedCategory('All');
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
                  href={`/accounts/${product.id}`}
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
        </main>
      </div>
    </div>
  );
}
