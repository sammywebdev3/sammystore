'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

// Paystack is temporarily paused (compliance flag on the account).
// Flip this back to true once Paystack is reactivated.
const PAYSTACK_ENABLED = false;

const BANK_DETAILS = {
  bank: 'United Bank of Africa (UBA)',
  accountNumber: '2136011152',
  accountName: 'Akintan Ayomide Olamilekan',
};

export default function FundPage() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMsg, setManualMsg] = useState('');
  const [manualMsgType, setManualMsgType] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualRef, setManualRef] = useState('');
  const [manualScreenshot, setManualScreenshot] = useState<string | null>(null);
  const [manualScreenshotName, setManualScreenshotName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (typeof data.balance === 'number') setBalance(data.balance);
        })
        .catch(console.error);
    }
  }, []);

  const handleFund = async () => {
    setLoading(true);
    setMsg('');

    const token = localStorage.getItem('token');
    if (!token) {
      setMsgType('error');
      setMsg('Please login to fund your wallet');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet/fund-paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      const data = await res.json();

      if (data.success && data.url) {
        // Send the user to Paystack's hosted checkout. They'll be brought
        // back to /fund/callback afterwards, which verifies and credits.
        window.location.href = data.url;
        return;
      } else {
        setMsgType('error');
        setMsg(data.error || 'Failed to start payment');
      }
    } catch (error: any) {
      setMsgType('error');
      setMsg('Network error: ' + error.message);
    }
    setLoading(false);
  };

  const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setManualScreenshot(null);
      setManualScreenshotName('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setManualMsgType('error');
      setManualMsg('Please upload an image file (PNG, JPG, etc.)');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setManualMsgType('error');
      setManualMsg('Screenshot must be under 5MB');
      e.target.value = '';
      return;
    }
    setManualMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setManualScreenshot(reader.result as string);
      setManualScreenshotName(file.name);
    };
    reader.onerror = () => {
      setManualMsgType('error');
      setManualMsg('Could not read that file, please try another');
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async () => {
    setManualMsg('');
    const token = localStorage.getItem('token');
    if (!token) {
      setManualMsgType('error');
      setManualMsg('Please login to submit a funding request');
      return;
    }
    if (!manualAmount || parseFloat(manualAmount) <= 0) {
      setManualMsgType('error');
      setManualMsg('Enter a valid amount');
      return;
    }

    setManualLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: `Manual wallet funding - ₦${manualAmount}`,
          message: `I have made a bank transfer of ₦${manualAmount} to fund my wallet.\n\nBank: ${BANK_DETAILS.bank}\nAccount: ${BANK_DETAILS.accountNumber} (${BANK_DETAILS.accountName})\nTransfer reference/sender name: ${manualRef || 'Not provided'}\n\nPlease verify and credit my wallet.`,
          attachmentUrl: manualScreenshot || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setManualMsgType('success');
        setManualMsg('Request submitted! We will verify your transfer and credit your wallet shortly.');
        setManualAmount('');
        setManualRef('');
        setManualScreenshot(null);
        setManualScreenshotName('');
      } else {
        setManualMsgType('error');
        setManualMsg(data.error || 'Failed to submit request');
      }
    } catch (error: any) {
      setManualMsgType('error');
      setManualMsg('Network error: ' + error.message);
    }
    setManualLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#f97316] mb-4 transition-colors">
            ← Back to Dashboard
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Fund Wallet</h1>
            <p className="text-gray-600">Add funds to your wallet to make purchases</p>
          </div>

          <div className="card p-6 md:p-8 max-w-2xl mb-8">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600 mb-2">Current Balance</p>
              <p className="text-4xl font-bold text-[#f97316]">₦{balance.toLocaleString()}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₦)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="input-field"
                min="100"
                step="100"
              />
            </div>

            <button
              onClick={handleFund}
              disabled={!PAYSTACK_ENABLED || loading || !amount}
              className="btn-primary w-full disabled:opacity-50"
            >
              {!PAYSTACK_ENABLED
                ? 'Paystack Temporarily Unavailable'
                : loading
                  ? 'Redirecting to Paystack...'
                  : 'Pay with Paystack'}
            </button>

            {!PAYSTACK_ENABLED && (
              <p className="mt-3 text-sm text-gray-500 text-center">
                Card/online payments are paused for now. Please use manual bank transfer below.
              </p>
            )}

            {msg && (
              <div className={`mt-6 p-4 rounded-xl ${
                msgType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <p className="font-semibold">{msg}</p>
              </div>
            )}
          </div>

          <div className="card p-6 md:p-8 max-w-2xl mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Manual Bank Transfer</h2>
            <p className="text-gray-600 text-sm mb-6">
              Transfer directly to the account below, then submit your details so we can verify and credit your wallet.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Bank</span>
                <span className="font-semibold text-gray-800">{BANK_DETAILS.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Account Number</span>
                <span className="font-semibold text-gray-800">{BANK_DETAILS.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Account Name</span>
                <span className="font-semibold text-gray-800">{BANK_DETAILS.accountName}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Transferred (₦)</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="Enter amount you sent"
                className="input-field"
                min="100"
                step="100"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sender Name / Transfer Reference (optional)
              </label>
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="e.g. name on the sending account or reference number"
                className="input-field"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Screenshot (optional, max 5MB)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#f97316]/10 file:text-[#f97316] file:font-semibold hover:file:bg-[#f97316]/20"
              />
              {manualScreenshot && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={manualScreenshot}
                    alt="Screenshot preview"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{manualScreenshotName}</p>
                    <button
                      type="button"
                      onClick={() => { setManualScreenshot(null); setManualScreenshotName(''); }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleManualSubmit}
              disabled={manualLoading || !manualAmount}
              className="btn-primary w-full disabled:opacity-50"
            >
              {manualLoading ? 'Submitting...' : 'I Have Made the Transfer'}
            </button>

            {manualMsg && (
              <div className={`mt-6 p-4 rounded-xl ${
                manualMsgType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <p className="font-semibold">{manualMsg}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
