'use client';
import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function SmmPage() {
  const [services, setServices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/smm/services');
      const data = await res.json();
      if (data.success && Array.isArray(data.services)) {
        setServices(data.services);
      }
    } catch (error) {
      console.error('Failed to fetch SMM services:', error);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.category || 'Other'));
    return Array.from(set).sort();
  }, [services]);

  const servicesInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return services.filter((s) => (s.category || 'Other') === selectedCategory);
  }, [services, selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedService('');
  };

  const handleOrder = async () => {
    setPurchasing(true);
    setMsg('');
    setOrderData(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setMsgType('error');
      setMsg('Please login to place orders');
      setPurchasing(false);
      return;
    }

    try {
      const res = await fetch('/api/smm/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          service: selectedService,
          link,
          quantity: parseInt(quantity)
        })
      });
      const data = await res.json();

      if (data.success) {
        setMsgType('success');
        setMsg('Order placed successfully!');
        setOrderData(data);
      } else {
        setMsgType('error');
        setMsg(data.error || 'Order failed');
      }
    } catch (error: any) {
      setMsgType('error');
      setMsg('Network error: ' + error.message);
    }
    setPurchasing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">SMM Panel</h1>
            <p className="text-gray-600">Boost your social media presence</p>
          </div>

          <div className="card p-6 md:p-8 max-w-2xl">
            {loading ? (
              <p className="text-gray-600">Loading services...</p>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Choose a category...</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="input-field"
                    disabled={!selectedCategory}
                  >
                    <option value="">
                      {selectedCategory ? 'Choose a service...' : 'Select a category first'}
                    </option>
                    {servicesInCategory.map((service: any) => (
                      <option key={service.service} value={service.service}>
                        {service.name} - ₦{service.rate.toLocaleString()}/1000
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Target Link</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/username"
                className="input-field"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-field"
                min="100"
                step="100"
              />
            </div>

            <button
              onClick={handleOrder}
              disabled={purchasing || !selectedService || !link}
              className="btn-primary w-full disabled:opacity-50"
            >
              {purchasing ? 'Processing...' : 'Place Order'}
            </button>

            {msg && (
              <div className={`mt-6 p-4 rounded-xl ${
                msgType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <p className="font-semibold">{msg}</p>
              </div>
            )}

            {orderData && (
              <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4">Order Details:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Order ID: </span>
                    <span className="font-mono font-semibold">{orderData.orderId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Service: </span>
                    <span className="font-semibold">{selectedService}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity: </span>
                    <span className="font-semibold">{quantity}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
