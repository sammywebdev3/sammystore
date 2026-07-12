'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VirtualNumbersPage() {
  const [countries, setCountries] = useState<{id: string; name: string}[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    fetch('/api/numbers/tiger/countries')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.countries)) {
          setCountries(data.countries);
        } else {
          setError('Failed to load countries: ' + (data.error || 'Invalid response'));
        }
      })
      .catch(err => setError('Network error: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCountry) return;
    setServices([]);
    setError('');
    
    fetch(`/api/numbers/tiger/services?country=${selectedCountry}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.services)) {
          setServices(data.services);
        } else {
          setError('No services available for this country');
        }
      })
      .catch(err => setError('Failed to load services'));
  }, [selectedCountry]);

  const handleBuy = async () => {
    if (!selectedCountry || !selectedService) {
      setError('Please select both country and service');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login first');
      return;
    }

    try {
      const res = await fetch('/api/numbers/tiger/buy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          country: selectedCountry, 
          service: selectedService 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setOrder({ 
          id: data.orderId, 
          phone: data.phoneNumber,
          sms: null 
        });
        setError('');
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading countries...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <nav className="bg-white shadow-sm p-4 mb-6 rounded-lg">
        <Link href="/" className="text-xl font-bold text-[#f97316]">SAMMYSTORE</Link>
      </nav>

      <h1 className="text-2xl font-bold mb-2">Virtual Numbers</h1>
      <p className="text-gray-600 mb-6">Get instant SMS verification numbers worldwide</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
          ️ {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">1. Select Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none"
          >
            <option value="">Choose a country...</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">2. Select Service</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={!selectedCountry}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none disabled:bg-gray-100"
          >
            <option value="">Choose a service...</option>
            {services.map((s) => (
              <option key={s.service} value={s.service}>
                {s.name} - ₦{(s.price * 1550).toFixed(0)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleBuy}
          disabled={!selectedCountry || !selectedService}
          className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Get Number
        </button>

        {order && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-mono text-lg">{order.phone}</p>
            <p className="text-sm text-gray-600 mt-1">Order ID: {order.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
