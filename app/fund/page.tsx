'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const NEURAPAY_ENABLED = true;

export default function FundPage() {
  const [balance, setBalance] = useState(0);
  const [neurapayLoading, setNeurapayLoading] = useState(false);
  const [neurapayMsg, setNeurapayMsg] = useState('');
  const [neurapayMsgType, setNeurapayMsgType] = useState('');
  const [neurapayAccount, setNeurapayAccount] = useState<{ accountNumber: string; bankName: string; accountName: string } | null>(null);
  const [neurapayChecking, setNeurapayChecking] = useState(false);
  const [neurapayChannel, setNeurapayChannel] = useState<'paga' | 'palmpay'>('paga');
  const [identityType, setIdentityType] = useState<'BVN' | 'NIN' | ''>('');
  const [identityNumber, setIdentityNumber] = useState('');

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

  const handleNeurapayFund = async (channelOverride?: 'paga' | 'palmpay') => {
    const channel = channelOverride || neurapayChannel;
    if (channel === 'palmpay' && (!identityType || !/^\d{11}$/.test(identityNumber))) {
      setNeurapayMsgType('error');
      setNeurapayMsg('Select BVN or NIN and enter the 11-digit number.');
      return;
    }

    setNeurapayLoading(true);
    setNeurapayMsg('');

    const token = localStorage.getItem('token');
    if (!token) {
      setNeurapayMsgType('error');
      setNeurapayMsg('Please login to fund your wallet');
      setNeurapayLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet/fund-neurapay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          channel,
          identityType: channel === 'palmpay' ? identityType : undefined,
          identityNumber: channel === 'palmpay' ? identityNumber : undefined,
        })
      });
      const data = await res.json();

      if (data.success && data.account) {
        setNeurapayAccount(data.account);
      } else {
        setNeurapayMsgType('error');
        setNeurapayMsg(data.error || 'Failed to generate a payment account');
      }
    } catch (error: any) {
      setNeurapayMsgType('error');
      setNeurapayMsg('Network error: ' + error.message);
    }
    setNeurapayLoading(false);
  };

  // This account is PERMANENT once generated (same number every visit),
  // so check for an existing one on page load instead of making the user
  // press a button every time - fund-neurapay just returns the saved one
  // if it already exists, with no NeuraPay API call.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/wallet/fund-neurapay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel: 'paga' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.account) setNeurapayAccount(data.account);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBalance = async () => {
    setNeurapayChecking(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/wallet/balance', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (typeof data.balance === 'number') {
        setBalance(data.balance);
        setNeurapayMsgType('success');
        setNeurapayMsg('Balance refreshed.');
      }
    } catch (error: any) {
      setNeurapayMsgType('error');
      setNeurapayMsg('Network error: ' + error.message);
    }
    setNeurapayChecking(false);
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

            {NEURAPAY_ENABLED && (
              <div className="mt-3">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNeurapayChannel('paga');
                      setNeurapayAccount(null);
                      handleNeurapayFund('paga');
                    }}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                      neurapayChannel === 'paga' ? 'bg-[#f97316] text-white' : 'bg-white text-gray-600'
                    }`}
                  >
                    Paga
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNeurapayChannel('palmpay');
                      setNeurapayAccount(null);
                    }}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                      neurapayChannel === 'palmpay' ? 'bg-[#f97316] text-white' : 'bg-white text-gray-600'
                    }`}
                  >
                    PalmPay
                  </button>
                </div>

                {neurapayChannel === 'palmpay' && !neurapayAccount && (
                  <div className="p-3 bg-gray-50 rounded-xl mb-3 space-y-2">
                    <p className="text-xs text-gray-500">
                      PalmPay requires identity verification. Select BVN or NIN and enter the corresponding 11-digit number - this is only needed once.
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={identityType}
                        onChange={(e) => setIdentityType(e.target.value as 'BVN' | 'NIN' | '')}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="BVN">BVN</option>
                        <option value="NIN">NIN</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={identityNumber}
                        onChange={(e) => setIdentityNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="11-digit BVN or NIN number"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => handleNeurapayFund('palmpay')}
                      disabled={neurapayLoading}
                      className="btn-primary w-full disabled:opacity-50 mt-1"
                    >
                      {neurapayLoading ? 'Verifying...' : 'Verify & Generate PalmPay Account'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {neurapayLoading && !neurapayAccount && neurapayChannel === 'paga' && (
              <p className="text-sm text-gray-500 mt-2">Loading your NeuraPay account...</p>
            )}

            {neurapayAccount && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-sm text-gray-600 mb-2">
                  This is your permanent {neurapayChannel === 'palmpay' ? 'PalmPay' : 'Paga'} account - transfer any amount to it any time, your wallet is credited automatically once received.
                </p>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Bank</span>
                  <span className="font-semibold text-gray-800">{neurapayAccount.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Account Number</span>
                  <span className="font-semibold text-gray-800">{neurapayAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Account Name</span>
                  <span className="font-semibold text-gray-800">{neurapayAccount.accountName}</span>
                </div>
                <button
                  onClick={refreshBalance}
                  disabled={neurapayChecking}
                  className="btn-primary w-full disabled:opacity-50 mt-2"
                >
                  {neurapayChecking ? 'Refreshing...' : 'Refresh Balance'}
                </button>
              </div>
            )}

            {neurapayMsg && (
              <div className={`mt-6 p-4 rounded-xl ${
                neurapayMsgType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <p className="font-semibold">{neurapayMsg}</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
