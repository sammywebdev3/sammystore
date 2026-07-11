'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VirtualNumbersPage() {
  const [countries, setCountries] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedService, setSelectedService] = useState('');
  
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [order, setOrder] = useState<{ id: string; phone: string; sms: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/numbers/countries')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCountries(data.countries);
        else setError(data.error || 'Failed to load countries');
      })
      .catch(() => setError('Network error loading countries'))
      .finally(() => setLoadingCountries(false));
  }, []);

  useEffect(() => {
    if (!selectedCountry) return;
    setLoadingServices(true);
    setServices([]);
    setSuccessMsg('');
    setError('');
    
    fetch(`/api/numbers/products?country=${selectedCountry}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setServices(data.products);
        else setError(data.error || 'No services available for this country');
      })
      .catch(() => setError('Failed to load services'))
      .finally(() => setLoadingServices(false));
  }, [selectedCountry]);

  const handleBuy = async () => {
    if (!selectedCountry || !selectedService) {
      setError('Please select a country and service');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to purchase');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    setOrder(null);

    try {
      const res = await fetch('/api/numbers/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country: selectedCountry, product: selectedService })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Number acquired successfully!');
        setOrder({ id: data.orderId, phone: data.phoneNumber, sms: null });
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleCheckSms = async () => {
    if (!order?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/numbers/sms?orderId=${order.id}`);
      const data = await res.json();
      if (data.success) {
        if (data.sms) {
          setOrder(prev => prev ? { ...prev, sms: data.sms } : null);
          setSuccessMsg('SMS received!');
        } else {
          setError('No SMS yet. Waiting... (Status: ' + data.status + ')');
        }
      } else {
        setError(data.error || 'Check failed');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#f97316] rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold text-gray-800">SAMMY<span className="text-[#f97316]">STORE</span></span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-[#f97316]">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Virtual Numbers</h1>
          <p className="text-gray-500 mt-2">Get instant SMS verification numbers worldwide</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">1. Select Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              disabled={loadingCountries}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent bg-gray-50 disabled:opacity-60"
            >
              <option value="">Choose a country...</option>
              {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">2. Select Service</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              disabled={!selectedCountry || loadingServices}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent bg-gray-50 disabled:opacity-60"
            >
              <option value="">Choose a service...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {loadingServices && <p className="text-xs text-gray-400 mt-1">Loading services...</p>}
          </div>

          <button
            onClick={handleBuy}
            disabled={actionLoading || !selectedCountry || !selectedService}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Processing...' : 'Get Number'}
          </button>

          {order && (
            <div className="mt-6 p-5 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Phone Number</p>
                <p className="text-xl font-mono font-bold text-gray-800">{order.phone}</p>
              </div>
              <div className="pt-4 border-t border-orange-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">SMS Code</p>
                {order.sms ? (
                  <div className="p-3 bg-white rounded-lg border border-orange-200 font-mono text-lg text-green-600 font-bold text-center">
                    {order.sms}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center mb-3">Waiting for SMS... (Check every 15s)</p>
                )}
                <button
                  onClick={handleCheckSms}
                  disabled={actionLoading}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Checking...' : 'Refresh SMS'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
