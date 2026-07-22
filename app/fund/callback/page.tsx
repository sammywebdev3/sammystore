'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Confirming your payment...');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    const token = localStorage.getItem('token');

    if (!reference) {
      setStatus('error');
      setMessage('Missing payment reference.');
      return;
    }
    if (!token) {
      setStatus('error');
      setMessage('Please login to complete this payment.');
      return;
    }

    // This callback page is only reached via Paystack's hosted-checkout
    // redirect. NeuraPay virtual accounts don't redirect anywhere - that
    // flow is confirmed on the /fund page itself (webhook + manual check).
    setMessage('Confirming your payment with Paystack...');

    fetch('/api/wallet/verify-paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reference })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage(`Payment confirmed! New balance: ₦${(data.newBalance ?? 0).toLocaleString()}`);
        } else {
          setStatus('error');
          setMessage(data.error || 'We could not confirm this payment.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error while confirming payment.');
      });
  }, [params]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="card p-8 max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {status === 'checking' && 'Confirming Payment...'}
              {status === 'success' && 'Payment Successful ✅'}
              {status === 'error' && 'Payment Issue'}
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button className="btn-primary" onClick={() => router.push('/fund')}>
              Back to Fund Wallet
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function FundCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
