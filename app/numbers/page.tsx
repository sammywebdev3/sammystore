'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function VirtualNumbersPage() {
  const [selectedServer, setSelectedServer] = useState('usa1');
  const [services, setServices] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [carrier, setCarrier] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [duration, setDuration] = useState('1D');
  const [quantity, setQuantity] = useState('1');
  const [pool, setPool] = useState('1');
  const [maxPrice, setMaxPrice] = useState('');
  const [operator, setOperator] = useState('');
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [balance, setBalance] = useState(0);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    fetchServices();
    if (selectedServer !== 'usa1') {
      fetchCountries();
    }
  }, [selectedServer]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch(selectedServer) {
        case 'usa1':
          endpoint = '/api/numbers/usa-server1?action=getServices';
          break;
        case 'all1':
          endpoint = '/api/numbers/all-countries-server1?action=getServices';
          break;
        case 'all2':
          endpoint = '/api/numbers/all-countries-server2?action=getServices&country=US';
          break;
      }
      
      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.services || data.data) && (data.services || data.data).length > 0) {
        setServices(data.services || data.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    }
    setLoading(false);
  };

  const fetchCountries = async () => {
    try {
      let endpoint = '';
      switch(selectedServer) {
        case 'all1':
          endpoint = '/api/numbers/all-countries-server1?action=getCountries';
          break;
        case 'all2':
          endpoint = '/api/numbers/all-countries-server2?action=getCountries';
          break;
      }
      
      if (endpoint) {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setCountries(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    }
  };

  const purchaseNumber = async () => {
    setPurchasing(true);
    setMsg('');
    setOrderData(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setMsgType('error');
      setMsg('Please login to purchase');
      setPurchasing(false);
      return;
    }

    try {
      let endpoint = '';
      // FIX: Add cost to the body so backend can check balance
      let body: any = { 
        service: selectedService,
        cost: 500 // Default cost
      };

      // If using Server 2, try to get the price from the selected service
      if (selectedServer === 'all2') {
        const selectedServiceObj = services.find(s => (s.id || s.slug || s) === selectedService);
        if (selectedServiceObj && selectedServiceObj.price) {
          body.cost = parseFloat(selectedServiceObj.price);
        }
      }

      switch(selectedServer) {
        case 'usa1':
          endpoint = '/api/numbers/usa-server1';
          body.country = 'usa';
          if (carrier) body.carrier = carrier;
          if (areaCode) body.area_codes = areaCode;
          if (duration) body.duration = duration;
          break;
        case 'all1':
          endpoint = '/api/numbers/all-countries-server1';
          body.country = selectedCountry;
          if (quantity) body.quantity = quantity;
          if (areaCode) body.areacode = areaCode;
          if (pool) body.pool = pool;
          break;
        case 'all2':
          endpoint = '/api/numbers/all-countries-server2';
          body.country = selectedCountry;
          if (maxPrice) body.maxPrice = maxPrice;
          if (operator) body.operator = operator;
          if (ref) body.ref = ref;
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.success || data.parsed) {
        setMsgType('success');
        setMsg('Number acquired!');
        setOrderData(data.parsed || data);
        if (data.newBalance !== undefined) setBalance(data.newBalance);
      } else {
        setMsgType('error');
        // FIX: Show the exact error from the backend (e.g., Insufficient funds)
        setMsg(data.error || data.rawResponse || 'Purchase failed');
      }
    } catch (error: any) {
      setMsgType('error');
      setMsg('Network error: ' + error.message);
    }
    setPurchasing(false);
  };

  const getServerName = () => {
    switch(selectedServer) {
      case 'usa1': return 'USA Server 1';
      case 'all1': return 'All Countries Server 1';
      case 'all2': return 'All Countries Server 2';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-8">
            <p className="terminal-text text-sm mb-2">{`> MODULE: VIRTUAL_NUMBERS`}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#e0e0e0]">BUY VIRTUAL NUMBERS</h1>
            {balance > 0 && <p className="text-[#00ff88] font-mono mt-2">Balance: ₦{balance}</p>}
          </div>

          {/* Server Selection Buttons */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => setSelectedServer('usa1')}
              className={`p-4 rounded-lg border-2 font-bold transition-all ${
                selectedServer === 'usa1'
                  ? 'border-[#00ff88] bg-[#00ff88]/20 text-[#00ff88]'
                  : 'border-[#2a2a3a] bg-[#1a1a25] text-[#a0a0b0] hover:border-[#00f5ff]'
              }`}
            >
              🇺🇸 USA Server 1
            </button>
            <button
              onClick={() => setSelectedServer('all1')}
              className={`p-4 rounded-lg border-2 font-bold transition-all ${
                selectedServer === 'all1'
                  ? 'border-[#00f5ff] bg-[#00f5ff]/20 text-[#00f5ff]'
                  : 'border-[#2a2a3a] bg-[#1a1a25] text-[#a0a0b0] hover:border-[#00f5ff]'
              }`}
            >
              🌍 All Countries Server 1
            </button>
            <button
              onClick={() => setSelectedServer('all2')}
              className={`p-4 rounded-lg border-2 font-bold transition-all ${
                selectedServer === 'all2'
                  ? 'border-[#ffd700] bg-[#ffd700]/20 text-[#ffd700]'
                  : 'border-[#2a2a3a] bg-[#1a1a25] text-[#a0a0b0] hover:border-[#00f5ff]'
              }`}
            >
              🌐 All Countries Server 2
            </button>
          </div>

          <div className="card-dark max-w-2xl">
            <h2 className="text-2xl font-bold text-[#00f5ff] mb-6">{getServerName()}</h2>

            {/* Service Selection WITH PRICES */}
            <div className="mb-6">
              <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> SELECT_SERVICE`}</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="input-dark"
              >
                <option value="">Choose a service...</option>
                {services.map((service: any, idx: number) => (
                  <option key={idx} value={service.id || service.slug || service}>
                    {service.name || service} {service.price && `- ₦${parseFloat(service.price).toLocaleString()}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Selection */}
            {selectedServer !== 'usa1' && (
              <div className="mb-6">
                <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> SELECT_COUNTRY`}</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="input-dark"
                >
                  <option value="">Choose a country...</option>
                  {countries.map((country: any, idx: number) => (
                    <option key={idx} value={country.code || country.id || country}>
                      {country.flag ? country.flag + ' ' : ''}{country.name || country}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* USA Server 1 Specific Fields */}
            {selectedServer === 'usa1' && (
              <>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> CARRIER (Optional)`}</label>
                  <input type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g., Verizon" className="input-dark" />
                </div>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> AREA CODE (Optional)`}</label>
                  <input type="text" value={areaCode} onChange={(e) => setAreaCode(e.target.value)} placeholder="e.g., 212" className="input-dark" />
                </div>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> DURATION`}</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input-dark">
                    <option value="1D">1 Day</option>
                    <option value="3D">3 Days</option>
                    <option value="7D">7 Days</option>
                  </select>
                </div>
              </>
            )}

            {/* All Countries Server 1 Specific Fields */}
            {selectedServer === 'all1' && (
              <>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> QUANTITY`}</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className="input-dark" />
                </div>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> AREA CODE (Optional)`}</label>
                  <input type="text" value={areaCode} onChange={(e) => setAreaCode(e.target.value)} placeholder="e.g., 212" className="input-dark" />
                </div>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> POOL`}</label>
                  <select value={pool} onChange={(e) => setPool(e.target.value)} className="input-dark">
                    <option value="1">Pool 1</option>
                    <option value="2">Pool 2</option>
                  </select>
                </div>
              </>
            )}

            {/* All Countries Server 2 Specific Fields */}
            {selectedServer === 'all2' && (
              <>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> MAX PRICE`}</label>
                  <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Maximum price" className="input-dark" />
                </div>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> OPERATOR (Optional)`}</label>
                  <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Operator name" className="input-dark" />
                </div>
                <div className="mb-6">
                  <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> REFERENCE (Optional)`}</label>
                  <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference ID" className="input-dark" />
                </div>
              </>
            )}

            <button
              onClick={purchaseNumber}
              disabled={purchasing || !selectedService || (selectedServer !== 'usa1' && !selectedCountry)}
              className="btn-neon-green w-full mt-6"
            >
              {purchasing ? 'PURCHASING...' : 'PURCHASE NUMBER'}
            </button>

            {msg && (
              <div className={`mt-6 p-4 rounded text-center border ${
                msgType === 'success' ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]' : 'border-[#ff2a6d] bg-[#ff2a6d]/10 text-[#ff2a6d]'
              }`}>
                <p className="font-mono font-bold">{msg}</p>
              </div>
            )}

            {orderData && (
              <div className="mt-6 p-6 border border-[#00ff88]/30 bg-[#00ff88]/5 rounded-lg">
                <h3 className="text-[#00ff88] font-mono mb-4">{`> ORDER_DETAILS:`}</h3>
                <div className="space-y-2 font-mono text-sm">
                  {orderData.order_id && <div><span className="text-[#a0a0b0]">Order ID: </span><span className="text-[#e0e0e0]">{orderData.order_id}</span></div>}
                  {orderData.number && <div><span className="text-[#a0a0b0]">Number: </span><span className="text-[#e0e0e0]">{orderData.number}</span></div>}
                  {typeof orderData === 'string' && <div className="break-all text-[#e0e0e0]">{orderData}</div>}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
