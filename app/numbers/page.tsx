'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Country {
  id: string;
  name: string;
}

interface Service {
  service: string;
  name: string;
  price: number;
  count: number;
}

interface Order {
  id: string;
  phone: string;
  service: string;
  price: number;
  sms: string | null;
  statusCode?: number;
}

export default function VirtualNumbersPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState(false);
  const [checkingSms, setCheckingSms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/numbers/tiger/countries');
        const data = await res.json();

        if (data.success && Array.isArray(data.countries)) {
          setCountries(data.countries);
          setError('');
        } else {
          setError('Failed to load countries: ' + (data.error || 'Unknown error'));
        }
      } catch (err: any) {
        setError('Network error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
  }, []);

  // Load services when country changes
  useEffect(() => {
    if (!selectedCountry) {
      setServices([]);
      return;
    }

    const loadServices = async () => {
      try {
        setLoadingServices(true);
        setSelectedService('');
        setError('');

        const res = await fetch(
          `/api/numbers/tiger/services?country=${selectedCountry}`
        );
        const data = await res.json();

        if (data.success && Array.isArray(data.services)) {
          setServices(data.services);
        } else {
          setError(data.error || 'Failed to load services');
          setServices([]);
        }
      } catch (err: any) {
        setError('Network error: ' + err.message);
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, [selectedCountry]);

  const handleBuy = async () => {
    if (!selectedCountry || !selectedService) {
      setError('Please select both country and service');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login first');
      router.push('/login');
      return;
    }

    try {
      setBuyingNumber(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/numbers/tiger/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
          service: data.service,
          price: data.price,
          sms: null
        });
        setWalletBalance(data.newBalance);
        setSuccess(`Number acquired! Waiting for SMS...`);
        setSelectedCountry('');
        setSelectedService('');
        setServices([]);

        // Start checking SMS
        checkSmsStatus(data.orderId);
      } else {
        setError(data.error || 'Failed to buy number');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setBuyingNumber(false);
    }
  };

  const checkSmsStatus = async (activationId: string) => {
    try {
      setCheckingSms(true);

      const res = await fetch(`/api/numbers/tiger/sms?id=${activationId}`);
      const data = await res.json();

      if (data.success) {
        if (data.status === 'completed' && data.sms) {
          setOrder(prev => prev ? { ...prev, sms: data.sms, statusCode: data.statusCode } : null);
          setSuccess('SMS received!');
        } else if (data.status === 'pending') {
          // Keep checking
          setTimeout(() => checkSmsStatus(activationId), 3000);
        } else if (data.status === 'cancelled' || data.status === 'released') {
          setError('Activation was cancelled or number was released');
        }
      }
    } catch (err: any) {
      console.error('SMS check error:', err);
    } finally {
      setCheckingSms(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-white">Loading countries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      {/* Header */}
      <nav className="bg-gray-800 shadow-lg p-4 mb-6 rounded-lg border border-gray-700">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-[#f97316]">SAMMY</span>
          <span className="text-white">STORE</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Virtual Numbers</h1>
          <p className="text-gray-400">Get instant SMS verification numbers worldwide</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg mb-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-900 border border-green-700 text-green-100 p-4 rounded-lg mb-4 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        {!order ? (
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl">
            {/* Country Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                1. Select Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition"
              >
                <option value="">Choose a country...</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                2. Select Service
              </label>
              {loadingServices ? (
                <div className="w-full p-3 bg-gray-700 border border-gray-600 text-gray-400 rounded-lg text-center">
                  Loading services...
                </div>
              ) : (
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  disabled={!selectedCountry || services.length === 0}
                  className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Choose a service...</option>
                  {services.map((s) => (
                    <option key={s.service} value={s.service}>
                      {s.name} - ₦{(s.price * 1550).toFixed(0)} (Qty: {s.count})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Buy Button */}
            <button
              onClick={handleBuy}
              disabled={!selectedCountry || !selectedService || buyingNumber}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {buyingNumber ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing...
                </>
              ) : (
                '📱 Get Number'
              )}
            </button>
          </div>
        ) : (
          /* Order Display */
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">📞 Your Number</h2>

            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <p className="text-gray-400 text-sm mb-1">Phone Number</p>
              <p className="text-3xl font-mono font-bold text-[#f97316] break-all">{order.phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Service</p>
                <p className="text-white font-semibold">{order.service}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Price</p>
                <p className="text-white font-semibold">₦{order.price.toFixed(2)}</p>
              </div>
            </div>

            {order.sms ? (
              <div className="bg-green-900 border border-green-700 p-4 rounded-lg mb-4">
                <p className="text-gray-300 text-sm mb-1">SMS Code</p>
                <p className="text-2xl font-mono font-bold text-green-400">{order.sms}</p>
              </div>
            ) : (
              <div className="bg-blue-900 border border-blue-700 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <p className="text-blue-200">Waiting for SMS code...</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setOrder(null);
                setSuccess('');
                setError('');
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Get Another Number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
