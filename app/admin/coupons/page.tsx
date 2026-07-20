'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Coupon {
  _id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/coupons', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons);
      } else {
        setError(data.error || 'Failed to load coupons');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code: code.trim(),
          type,
          value: parseFloat(value),
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
          usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
          perUserLimit: perUserLimit ? parseInt(perUserLimit) : undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCode('');
        setValue('');
        setMaxDiscount('');
        setUsageLimit('');
        setPerUserLimit('1');
        setExpiresAt('');
        loadCoupons();
      } else {
        setError(data.error || 'Failed to create coupon');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await fetch(`/api/admin/coupons/${coupon._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !coupon.active }),
      });
      loadCoupons();
    } catch (err) {
      console.error('Failed to toggle coupon:', err);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon permanently?')) return;
    try {
      await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', headers: authHeaders() });
      loadCoupons();
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coupons</h1>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">
          &larr; Admin Home
        </Link>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-gray-800 mb-2">Create Coupon</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (e.g. WELCOME10)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm col-span-2"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off (₦)</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'percent' ? 'Value (e.g. 10 for 10%)' : 'Value (e.g. 500 for ₦500)'}
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {type === 'percent' && (
            <input
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              placeholder="Max discount cap (₦, optional)"
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
          <input
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Total usage limit (optional)"
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={perUserLimit}
            onChange={(e) => setPerUserLimit(e.target.value)}
            placeholder="Per-user limit"
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm"
        >
          {creating ? 'Creating...' : 'Create Coupon'}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading coupons...</p>
      ) : coupons.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          No coupons yet.
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">{c.code}</p>
                <p className="text-xs text-gray-500">
                  {c.type === 'percent' ? `${c.value}% off` : `₦${c.value.toLocaleString()} off`}
                  {c.maxDiscount ? ` (max ₦${c.maxDiscount.toLocaleString()})` : ''}
                  {' · '}Used {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}
                  {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(c)}
                  className="text-xs text-gray-600 hover:text-gray-900 font-semibold"
                >
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteCoupon(c._id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
