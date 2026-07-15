'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  instructions?: string;
  stock: number;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ productName: string; credentials: string } | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/catalog/products');
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch {
      // leave products empty - the "no products" state covers this
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category || 'Other'));
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => (p.category || 'Other') === selectedCategory);
  }, [products, selectedCategory]);

  const handleBuy = async (product: Product) => {
    setError('');
    if (!window.confirm(`Buy "${product.name}" for ₦${product.price.toLocaleString()}?`)) return;
    setBuyingId(product.id);
    try {
      const res = await fetch('/api/catalog/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ productName: product.name, credentials: data.credentials });
        fetchProducts();
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
    setBuyingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading catalog...</p>
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">My Catalog</h1>
            <p className="text-gray-600">Accounts sold directly by SammyStore — instant delivery from our own stock</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}

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

          {visibleProducts.length === 0 ? (
            <p className="text-gray-600 mb-8">No products in this category yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className={`card p-6 ${product.stock === 0 ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-block text-xs font-semibold text-[#f97316] bg-primary-50 px-2 py-1 rounded-full">
                      {product.category}
                    </span>
                    <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                      IN HOUSE
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-gray-500 mb-2">{product.description}</p>
                  )}
                  <p className="text-2xl font-bold text-[#f97316] mb-2">₦{product.price.toLocaleString()}</p>
                  <p className={`text-sm mb-4 ${product.stock === 0 ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                    {product.stock === 0 ? 'Out of Stock' : `${product.stock.toLocaleString()} available`}
                  </p>
                  <button
                    onClick={() => handleBuy(product)}
                    disabled={product.stock === 0 || buyingId === product.id}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {buyingId === product.id ? 'Processing...' : product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Purchase Successful!</h2>
            <p className="text-gray-600 text-sm mb-4">{result.productName}</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Your account details</p>
              <p className="font-mono text-sm text-gray-800 whitespace-pre-wrap break-words">{result.credentials}</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              This is also saved in your Order History if you need to find it again later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.credentials);
                }}
                className="btn-secondary flex-1 text-sm py-2"
              >
                Copy
              </button>
              <button onClick={() => setResult(null)} className="btn-primary flex-1 text-sm py-2">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
