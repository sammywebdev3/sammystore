'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState('');
  const [referredCount, setReferredCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferrals = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/account/referrals', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setReferralCode(data.referralCode);
          setReferredCount(data.referredCount);
          setTotalEarned(data.totalEarned);
        }
      } catch (err) {
        console.error('Failed to fetch referrals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const referralLink = referralCode
    ? `https://sammystorelogs.com/register?ref=${referralCode}`
    : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto p-4 pt-8 text-gray-500 text-sm">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Refer Friends, Earn Rewards</h1>
      <p className="text-gray-600 mb-6">
        Share your referral link. When someone signs up with it and makes their first deposit,
        you get ₦500 credited to your wallet automatically.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Referral Link</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
          />
          <button
            onClick={handleCopy}
            className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-4 py-2 rounded-lg text-sm flex-shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">People Referred</p>
          <p className="text-2xl font-bold text-gray-800">{referredCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-[#f97316]">₦{totalEarned.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
