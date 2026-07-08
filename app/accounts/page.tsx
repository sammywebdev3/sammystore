'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function AccountsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [balance, setBalance] = useState(0);
  const [accountData, setAccountData] = useState<any>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/accounts/products');
        const data = await res.json();
        
        console.log('Products response:', data);
        
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          setError(data.error || 'Failed to load products');
          setProducts([]);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  const handleBuy = async () => {
    if (!selectedProduct) {
      setMsgType('error');
      setMsg('Please select a product');
      return;
    }

    setBuying(true);
    setMsg('');
    setAccountData(null);
    
    const token = localStorage.getItem('token');
    if (!token) {
      setMsgType('error');
      setMsg('Please login');
      setBuying(false);
      return;
    }

    try {
      const res = await fetch('/api/accounts/buy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          productId: selectedProduct.id,
          amount: 1,
          price: selectedProduct.price 
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setMsgType('success');
        setMsg(data.message);
        setAccountData(data.accountData);
        setBalance(data.newBalance);
      } else {
        setMsgType('error');
        setMsg(data.error);
      }
    } catch (e: any) {
      setMsgType('error');
      setMsg('Network error: ' + e.message);
    }
    setBuying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-[#00ff88] font-mono">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-8">
            <p className="terminal-text text-sm mb-2">{`> MODULE: ACCOUNT_MARKET`}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#e0e0e0]">BUY ACCOUNTS</h1>
            {balance > 0 && <p className="text-[#00ff88] font-mono mt-2">Balance: ₦{balance}</p>}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#ff2a6d]/10 border border-[#ff2a6d]/30 rounded-lg">
              <p className="text-[#ff2a6d] font-mono">Error: {error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-[#ff2a6d]/20 hover:bg-[#ff2a6d]/30 rounded text-[#ff2a6d] text-sm"
              >
                Reload
              </button>
            </div>
          )}

          {products.length === 0 && !error && (
            <div className="mb-6 p-4 bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-lg">
              <p className="text-[#ffd700] font-mono">No products available</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {products.map((product: any) => (
              <div 
                key={product.id} 
                onClick={() => setSelectedProduct(product)}
                className={`card-dark cursor-pointer border-2 transition-all ${
                  selectedProduct?.id === product.id 
                    ? 'border-[#00ff88] bg-[#00ff88]/5' 
                    : 'border-[#2a2a3a]'
                }`}
              >
                <h3 className="text-xl font-bold text-[#e0e0e0] mb-2">{product.name || product.title}</h3>
                <p className="text-[#ffd700] font-mono text-lg mb-2">₦{product.price}</p>
                <p className="text-[#00ff88] text-sm font-mono">{product.stock || 'In Stock'} available</p>
              </div>
            ))}
          </div>
          
          {selectedProduct && (
            <div className="card-dark max-w-2xl">
              <h3 className="text-2xl font-bold text-[#00f5ff] mb-4">{selectedProduct.name || selectedProduct.title}</h3>
              <p className="text-[#ffd700] font-mono text-2xl mb-4">{selectedProduct.price}</p>
              <button onClick={handleBuy} disabled={buying} className="btn-neon-green w-full">
                {buying ? 'SECURING ACCOUNT...' : 'PURCHASE NOW'}
              </button>
              
              {msg && (
                <div className={`mt-6 p-4 rounded text-center border ${
                  msgType === 'success' 
                    ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]' 
                    : 'border-[#ff2a6d] bg-[#ff2a6d]/10 text-[#ff2a6d]'
                }`}>
                  <p className="font-mono font-bold">{msg}</p>
                </div>
              )}

              {accountData && (
                <div className="mt-6 p-6 border border-[#00ff88]/30 bg-[#00ff88]/5 rounded-lg">
                  <h3 className="text-[#00ff88] font-mono mb-4">{`> ACCOUNT_ACQUIRED:`}</h3>
                  <div className="font-mono text-sm text-[#e0e0e0] break-all">
                    {typeof accountData === 'object' ? JSON.stringify(accountData, null, 2) : accountData}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
