'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BenotpServerGrid from '@/components/BenotpServerGrid';
import type { BenotpPool } from '@/lib/benotp';

interface Country {
  id: string;
  name: string;
}

interface Service {
  service: string;
  name: string;
  price: number;
  priceNgn: number;
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
  const [provider, setProvider] = useState<'tigersms' | 'benotp'>('tigersms');
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checkingSms, setCheckingSms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smsPollActiveRef = useRef(true);

  // BenOTP is a separate, self-contained flow with its own state - it
  // doesn't share countries/services with TigerSMS since BenOTP's four
  // pools don't have a live per-country service catalog wired up yet
  // (only "All Countries 1" documents a getPrice/service-list endpoint).
  // Service is entered directly as a code (e.g. "wa" for WhatsApp) per
  // BenOTP's own API convention.
  const [benotpPool, setBenotpPool] = useState<BenotpPool>('usa1');
  const [benotpService, setBenotpService] = useState('');
  const [benotpCountry, setBenotpCountry] = useState('');
  const [benotpAreaCode, setBenotpAreaCode] = useState('');
  const [benotpCarrier, setBenotpCarrier] = useState('');
  // Live catalog for usa1/usa2 (browsable) - all1 has no bulk listing
  // action, so it uses a one-off "check price" quote instead (see below).
  // all2 stays on flat admin-set pricing until its getPrices response is
  // fixed on BenOTP's side - see notes in lib/benotp.ts.
  const [benotpServices, setBenotpServices] = useState<
    { service: string; name: string; priceNgn: number; available: boolean | null }[]
  >([]);
  const [benotpServicesLoading, setBenotpServicesLoading] = useState(false);
  const [benotpServicesError, setBenotpServicesError] = useState('');
  const [benotpQuote, setBenotpQuote] = useState<{ priceNgn: number; count: number } | null>(null);
  const [benotpQuoteLoading, setBenotpQuoteLoading] = useState(false);
  const [benotpBuying, setBenotpBuying] = useState(false);
  const [benotpCancelling, setBenotpCancelling] = useState(false);
  const [benotpError, setBenotpError] = useState('');
  const [benotpSuccess, setBenotpSuccess] = useState('');
  const [benotpOrder, setBenotpOrder] = useState<Order | null>(null);
  const benotpPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const benotpPollActiveRef = useRef(true);

  // Stop polling if the component unmounts (e.g. user navigates away)
  useEffect(() => {
    smsPollActiveRef.current = true;
    benotpPollActiveRef.current = true;
    return () => {
      smsPollActiveRef.current = false;
      benotpPollActiveRef.current = false;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (benotpPollTimeoutRef.current) clearTimeout(benotpPollTimeoutRef.current);
    };
  }, []);

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

  // Live BenOTP catalog for usa1/usa2 - reload whenever the chosen server
  // changes. all1/all2 don't get a bulk list here (see benotpQuote below).
  useEffect(() => {
    if (provider !== 'benotp' || (benotpPool !== 'usa1' && benotpPool !== 'usa2')) {
      setBenotpServices([]);
      return;
    }

    const loadBenotpServices = async () => {
      try {
        setBenotpServicesLoading(true);
        setBenotpServicesError('');
        setBenotpService('');

        const res = await fetch(`/api/numbers/benotp/services?pool=${benotpPool}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.services)) {
          setBenotpServices(data.services);
        } else {
          setBenotpServicesError(data.error || 'Failed to load services');
          setBenotpServices([]);
        }
      } catch (err: any) {
        setBenotpServicesError('Network error: ' + err.message);
        setBenotpServices([]);
      } finally {
        setBenotpServicesLoading(false);
      }
    };

    loadBenotpServices();
  }, [provider, benotpPool]);

  // all1 has no bulk catalog - price is looked up per service+country pair
  // once the customer has entered both. Debounced slightly so we don't fire
  // a request on every keystroke.
  useEffect(() => {
    setBenotpQuote(null);
    if (benotpPool !== 'all1' || !benotpService.trim() || !benotpCountry.trim()) return;

    const handle = setTimeout(async () => {
      try {
        setBenotpQuoteLoading(true);
        const params = new URLSearchParams({
          service: benotpService.trim(),
          country: benotpCountry.trim(),
        });
        if (benotpAreaCode.trim()) params.set('areaCode', benotpAreaCode.trim());

        const res = await fetch(`/api/numbers/benotp/price?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setBenotpQuote({ priceNgn: data.priceNgn, count: data.count });
        } else {
          setBenotpQuote(null);
        }
      } catch {
        setBenotpQuote(null);
      } finally {
        setBenotpQuoteLoading(false);
      }
    }, 500);

    return () => clearTimeout(handle);
  }, [benotpPool, benotpService, benotpCountry, benotpAreaCode]);

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

  const handleCancel = async () => {
    if (!order) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login first');
      router.push('/login');
      return;
    }

    try {
      setCancelling(true);
      setError('');

      const res = await fetch('/api/numbers/tiger/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ activationId: order.id })
      });
      const data = await res.json();

      if (data.success) {
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
        smsPollActiveRef.current = false;
        setWalletBalance(prev => prev + (data.refunded || 0));
        setSuccess('Number cancelled and refunded to your wallet.');
        setOrder(null);
      } else {
        setError(data.error || 'Failed to cancel number');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const checkSmsStatus = async (activationId: string, attempt: number = 1) => {
    // Cap polling so this doesn't run forever in the background if the SMS
    // never arrives (e.g. 3s * 200 = 10 minutes).
    const MAX_ATTEMPTS = 200;

    try {
      setCheckingSms(true);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/numbers/tiger/sms?id=${activationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();

      if (!smsPollActiveRef.current) return;

      if (data.success) {
        if (data.status === 'completed' && data.sms) {
          setOrder(prev => prev ? { ...prev, sms: data.sms, statusCode: data.statusCode } : null);
          setSuccess('SMS received!');
        } else if (data.status === 'pending') {
          if (attempt < MAX_ATTEMPTS) {
            pollTimeoutRef.current = setTimeout(
              () => checkSmsStatus(activationId, attempt + 1),
              3000
            );
          } else {
            setError('Timed out waiting for SMS. You can try requesting a new number.');
          }
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

  const handleBenotpBuy = async () => {
    if (!benotpService.trim()) {
      setBenotpError('Please enter a service code');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setBenotpError('Please login first');
      router.push('/login');
      return;
    }

    try {
      setBenotpBuying(true);
      setBenotpError('');
      setBenotpSuccess('');

      const res = await fetch('/api/numbers/benotp/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pool: benotpPool,
          service: benotpService.trim(),
          country: benotpCountry.trim() || undefined,
          areaCode: benotpAreaCode.trim() || undefined,
          carrier: benotpCarrier.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setBenotpOrder({
          id: data.orderId,
          phone: data.phoneNumber,
          service: benotpService.trim(),
          price: data.price,
          sms: null,
        });
        setWalletBalance(data.newBalance);
        setBenotpSuccess('Number acquired! Waiting for SMS...');
        benotpCheckSmsStatus(data.orderId);
      } else {
        setBenotpError(data.error || 'Failed to buy number');
      }
    } catch (err: any) {
      setBenotpError('Network error: ' + err.message);
    } finally {
      setBenotpBuying(false);
    }
  };

  const handleBenotpCancel = async () => {
    if (!benotpOrder) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setBenotpError('Please login first');
      router.push('/login');
      return;
    }

    try {
      setBenotpCancelling(true);
      setBenotpError('');

      const res = await fetch('/api/numbers/benotp/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activationId: benotpOrder.id }),
      });
      const data = await res.json();

      if (data.success) {
        if (benotpPollTimeoutRef.current) clearTimeout(benotpPollTimeoutRef.current);
        benotpPollActiveRef.current = false;
        setWalletBalance((prev) => prev + (data.refunded || 0));
        setBenotpSuccess('Number cancelled and refunded to your wallet.');
        setBenotpOrder(null);
      } else {
        setBenotpError(data.error || 'Failed to cancel number');
      }
    } catch (err: any) {
      setBenotpError('Network error: ' + err.message);
    } finally {
      setBenotpCancelling(false);
    }
  };

  const benotpCheckSmsStatus = async (activationId: string, attempt: number = 1) => {
    const MAX_ATTEMPTS = 200;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/numbers/benotp/status?id=${activationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (!benotpPollActiveRef.current) return;

      if (data.success) {
        if (data.status === 'completed' && data.sms) {
          setBenotpOrder((prev) => (prev ? { ...prev, sms: data.sms } : null));
          setBenotpSuccess('SMS received!');
        } else if (data.status === 'pending') {
          if (attempt < MAX_ATTEMPTS) {
            benotpPollTimeoutRef.current = setTimeout(
              () => benotpCheckSmsStatus(activationId, attempt + 1),
              3000
            );
          } else {
            setBenotpError('Timed out waiting for SMS. You can try requesting a new number.');
          }
        } else if (data.status === 'cancelled') {
          setBenotpError('Activation was cancelled or number was released');
        }
      }
    } catch (err: any) {
      console.error('BenOTP SMS check error:', err);
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
        <Link href="/dashboard" className="text-2xl font-bold">
          <span className="text-[#f97316]">SAMMY</span>
          <span className="text-white">STORE</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Virtual Numbers</h1>
          <p className="text-gray-400">Get instant SMS verification numbers worldwide</p>
        </div>

        {/* Provider Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setProvider('tigersms')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
              provider === 'tigersms'
                ? 'bg-[#f97316] text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
            }`}
          >
            Server 1
          </button>
          <button
            onClick={() => setProvider('benotp')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
              provider === 'benotp'
                ? 'bg-[#f97316] text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
            }`}
          >
            Server 2
          </button>
        </div>

        {provider === 'tigersms' && (
        <>
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
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-8">
              {[
                { label: 'Country', done: !!selectedCountry },
                { label: 'Service', done: !!selectedService },
                { label: 'Number', done: false },
              ].map((step, idx, arr) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                        step.done
                          ? 'bg-[#f97316] border-[#f97316] text-white'
                          : 'border-gray-600 text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-xs mt-1 ${step.done ? 'text-[#fb923c]' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`w-10 h-0.5 mx-2 mb-5 ${
                        arr[idx + 1].done || step.done ? 'bg-[#f97316]' : 'bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

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
                      {s.name} - ₦{s.priceNgn.toFixed(0)} (Qty: {s.count})
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

            {!order.sms && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed border border-red-700 text-red-100 font-semibold py-2 px-4 rounded-lg transition-colors mb-3"
              >
                {cancelling ? 'Cancelling...' : 'Cancel & Refund'}
              </button>
            )}

            <button
              onClick={() => {
                if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
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
        </>
        )}

        {provider === 'benotp' && (
        <>
        {benotpError && (
          <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg mb-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{benotpError}</p>
            </div>
          </div>
        )}

        {benotpSuccess && (
          <div className="bg-green-900 border border-green-700 text-green-100 p-4 rounded-lg mb-4 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-sm mt-1">{benotpSuccess}</p>
            </div>
          </div>
        )}

        {!benotpOrder ? (
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">1. Choose a Server</label>
              <BenotpServerGrid selected={benotpPool} onSelect={setBenotpPool} />
            </div>

            {(benotpPool === 'usa1' || benotpPool === 'usa2') ? (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  2. Service {benotpServicesLoading && <span className="text-gray-500">(loading prices...)</span>}
                </label>
                {benotpServicesError && (
                  <p className="text-sm text-red-400 mb-2">{benotpServicesError}</p>
                )}
                <select
                  value={benotpService}
                  onChange={(e) => setBenotpService(e.target.value)}
                  disabled={benotpServicesLoading || benotpServices.length === 0}
                  className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition disabled:opacity-50"
                >
                  <option value="">
                    {benotpServicesLoading ? 'Loading services...' : 'Select a service'}
                  </option>
                  {benotpServices.map((s) => (
                    <option key={s.service} value={s.service} disabled={s.available === false}>
                      {s.name} - ₦{s.priceNgn.toLocaleString()}
                      {s.available === false ? ' (out of stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  2. Service Code (e.g. wa for WhatsApp, tg for Telegram)
                </label>
                <input
                  type="text"
                  value={benotpService}
                  onChange={(e) => setBenotpService(e.target.value)}
                  placeholder="wa"
                  className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition"
                />
              </div>
            )}

            {(benotpPool === 'all1' || benotpPool === 'all2') && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Country Code</label>
                <input
                  type="text"
                  value={benotpCountry}
                  onChange={(e) => setBenotpCountry(e.target.value)}
                  placeholder="e.g. 0 for Russia, 1 for USA - see the country list"
                  className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition"
                />
              </div>
            )}

            {benotpPool === 'all1' && benotpService.trim() && benotpCountry.trim() && (
              <div className="mb-4 p-3 rounded-lg bg-gray-700 border border-gray-600 text-sm">
                {benotpQuoteLoading ? (
                  <span className="text-gray-400">Checking live price...</span>
                ) : benotpQuote ? (
                  <span className="text-white font-semibold">
                    ₦{benotpQuote.priceNgn.toLocaleString()} · {benotpQuote.count} available
                  </span>
                ) : (
                  <span className="text-gray-400">No live price for this service/country combo yet</span>
                )}
              </div>
            )}

            {(benotpPool === 'usa1' || benotpPool === 'usa2') && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Carrier (optional)</label>
                  <input
                    type="text"
                    value={benotpCarrier}
                    onChange={(e) => setBenotpCarrier(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Area Code (optional)</label>
                  <input
                    type="text"
                    value={benotpAreaCode}
                    onChange={(e) => setBenotpAreaCode(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleBenotpBuy}
              disabled={!benotpService.trim() || benotpBuying}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {benotpBuying ? (
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
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">📞 Your Number</h2>

            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <p className="text-gray-400 text-sm mb-1">Phone Number</p>
              <p className="text-3xl font-mono font-bold text-[#f97316] break-all">{benotpOrder.phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Service</p>
                <p className="text-white font-semibold">{benotpOrder.service}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Price</p>
                <p className="text-white font-semibold">₦{benotpOrder.price.toFixed(2)}</p>
              </div>
            </div>

            {benotpOrder.sms ? (
              <div className="bg-green-900 border border-green-700 p-4 rounded-lg mb-4">
                <p className="text-gray-300 text-sm mb-1">SMS Code</p>
                <p className="text-2xl font-mono font-bold text-green-400">{benotpOrder.sms}</p>
              </div>
            ) : (
              <div className="bg-blue-900 border border-blue-700 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <p className="text-blue-200">Waiting for SMS code...</p>
                </div>
              </div>
            )}

            {!benotpOrder.sms && (
              <button
                onClick={handleBenotpCancel}
                disabled={benotpCancelling}
                className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed border border-red-700 text-red-100 font-semibold py-2 px-4 rounded-lg transition-colors mb-3"
              >
                {benotpCancelling ? 'Cancelling...' : 'Cancel & Refund'}
              </button>
            )}

            <button
              onClick={() => {
                if (benotpPollTimeoutRef.current) clearTimeout(benotpPollTimeoutRef.current);
                setBenotpOrder(null);
                setBenotpSuccess('');
                setBenotpError('');
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Get Another Number
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
