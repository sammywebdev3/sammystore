'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  instructions?: string;
  active: boolean;
  availableCount: number;
  soldCount: number;
}

export default function AdminCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [creating, setCreating] = useState(false);

  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [stockText, setStockText] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch('/api/admin/catalog/products', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch {
      // leave products as-is
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/catalog/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name, category, price, description, instructions }),
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setCategory('');
        setPrice('');
        setDescription('');
        setInstructions('');
        fetchProducts();
      } else {
        setError(data.error || 'Failed to create product');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
    setCreating(false);
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await fetch(`/api/admin/catalog/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ active: !product.active }),
      });
      fetchProducts();
    } catch {
      setError('Failed to update product');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/catalog/products/${product._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
      } else {
        setError(data.error || 'Failed to delete product');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProductId) return;
    setAddingStock(true);
    setError('');
    try {
      const res = await fetch('/api/admin/catalog/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ productId: stockProductId, credentialsList: stockText }),
      });
      const data = await res.json();
      if (data.success) {
        setStockText('');
        setStockProductId(null);
        fetchProducts();
      } else {
        setError(data.error || 'Failed to add stock');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
    setAddingStock(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#f97316] mb-4 transition-colors">
          ← Back to Admin
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Catalog (Admin)</h1>
        <p className="text-gray-600 mb-8">Create your own account listings and stock them with credentials, separate from the benotp catalog.</p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="card p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Product</h2>
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product name (e.g. Aged Gmail Account)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Category (e.g. GMAIL)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="number"
              placeholder="Price (₦)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input-field"
              min="1"
              required
            />
            <input
              type="text"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
            <textarea
              placeholder="Buyer instructions (optional) - shown after purchase"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="input-field md:col-span-2"
              rows={2}
            />
            <button type="submit" disabled={creating} className="btn-primary md:col-span-2 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Product'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {products.length === 0 ? (
            <p className="text-gray-500">No products yet — create one above.</p>
          ) : (
            products.map((product) => (
              <div key={product._id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                      <span className="text-xs font-semibold text-[#f97316] bg-primary-50 px-2 py-1 rounded-full">
                        {product.category}
                      </span>
                      {!product.active && (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[#f97316] font-bold">₦{product.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      {product.availableCount} available · {product.soldCount} sold
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setStockProductId(stockProductId === product._id ? null : product._id)}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      {stockProductId === product._id ? 'Cancel' : 'Add Stock'}
                    </button>
                    <button
                      onClick={() => handleToggleActive(product)}
                      className="text-sm py-2 px-4 rounded-full border-2 border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      {product.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-sm py-2 px-4 rounded-full border-2 border-red-500 text-red-600 font-semibold hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {stockProductId === product._id && (
                  <form onSubmit={handleAddStock} className="mt-4 border-t border-gray-100 pt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Paste one account per line (any format - delivered to the buyer exactly as typed)
                    </label>
                    <textarea
                      value={stockText}
                      onChange={(e) => setStockText(e.target.value)}
                      className="input-field font-mono text-sm"
                      rows={5}
                      placeholder={'example1@gmail.com:password1\nexample2@gmail.com:password2'}
                      required
                    />
                    <button type="submit" disabled={addingStock} className="btn-primary mt-3 text-sm py-2 px-4 disabled:opacity-50">
                      {addingStock ? 'Adding...' : 'Add Stock'}
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
