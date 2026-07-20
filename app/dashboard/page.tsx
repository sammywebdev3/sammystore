'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

interface Activity {
  _id: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  metadata?: any;
  createdAt: string;
}

interface RecentNumber {
  activationId: string;
  description: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  virtual_number: '📞',
  smm: '🚀',
  account_purchase: '📱',
  wallet_fund: '💳',
  refund: '↩️',
  withdrawal: '🏦',
  transfer: '🔁',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NumberStatusRow({ number }: { number: RecentNumber }) {
  const [status, setStatus] = useState<'loading' | 'pending' | 'completed' | 'cancelled' | 'released' | 'unknown' | 'error'>('loading');
  const [sms, setSms] = useState<string | null>(null);

  const checkStatus = async () => {
    setStatus('loading');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/numbers/tiger/sms?id=${number.activationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setSms(data.sms || null);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badge: Record<string, string> = {
    loading: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
    released: 'bg-gray-100 text-gray-500',
    unknown: 'bg-gray-100 text-gray-500',
    error: 'bg-red-50 text-red-700',
  };

  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <p className="text-gray-800 font-semibold">{number.description}</p>
        <p className="text-gray-400 text-xs">{timeAgo(number.createdAt)}</p>
        {sms && <p className="text-green-600 text-sm font-mono mt-1">Code: {sms}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge[status]}`}>
          {status === 'loading' ? 'checking...' : status}
        </span>
        {status !== 'loading' && (
          <button onClick={checkStatus} className="text-gray-400 hover:text-[#f97316] text-xs">
            ↻
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [balance, setBalance] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [activeNumbers, setActiveNumbers] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<RecentNumber[]>([]);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchBalance = async () => {
      const res = await fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.balance !== undefined) setBalance(data.balance);
    };

    const fetchStats = async () => {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTotalTransactions(data.totalTransactions);
        setActiveNumbers(data.activeNumbers);
        setRecentActivity(data.recentActivity || []);
        setRecentNumbers(data.recentNumbers || []);
      }
    };

    const fetchSupportUnread = async () => {
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        setSupportUnreadCount(data.tickets.filter((t: any) => t.userUnread).length);
      }
    };

    fetchBalance();
    fetchStats();
    fetchSupportUnread();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Dashboard</h1>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-br from-orange-50 to-white">
              <h3 className="text-[#f97316] text-sm font-semibold mb-2">Wallet Balance</h3>
              <p className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">₦{balance.toLocaleString()}.00</p>
              <Link href="/fund" className="btn-primary text-sm py-2 px-4 inline-block">
                Fund Wallet
              </Link>
            </div>

            <div className="card p-6">
              <h3 className="text-gray-500 text-sm font-semibold mb-2">Refer Friends</h3>
              <p className="text-sm text-gray-600 mb-4">Earn ₦500 per referral</p>
              <Link href="/referrals" className="btn-primary text-sm py-2 px-4 inline-block">
                View Referral Link
              </Link>
            </div>

            <div className="card p-6">
              <h3 className="text-gray-500 text-sm font-semibold mb-2">Total Transactions</h3>
              <p className="text-3xl md:text-4xl font-bold text-gray-800">{totalTransactions}</p>
            </div>

            <div className="card p-6">
              <h3 className="text-gray-500 text-sm font-semibold mb-2">Active Numbers</h3>
              <p className="text-3xl md:text-4xl font-bold text-gray-800">{activeNumbers}</p>
            </div>
          </div>

          {recentNumbers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Live Numbers (last 24h)</h2>
              <div className="space-y-3">
                {recentNumbers.map((n) => (
                  <NumberStatusRow key={n.activationId} number={n} />
                ))}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-800 mb-6">Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/numbers" className="card p-6 group">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Virtual Numbers</h3>
              <p className="text-gray-500 text-sm">Rent anonymous numbers</p>
            </Link>
            <Link href="/smm" className="card p-6 group">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">SMM Panel</h3>
              <p className="text-gray-500 text-sm">Social media boost</p>
            </Link>
            <Link href="/accounts" className="card p-6 group">
              <div className="text-4xl mb-4">🛍️</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Buy Accounts</h3>
              <p className="text-gray-500 text-sm">Pre-verified accounts</p>
            </Link>
            <Link href="/logs" className="card p-6 group">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Buy Logs</h3>
              <p className="text-gray-500 text-sm">Verified logs &amp; digital accounts</p>
            </Link>
          
          <Link href="/support" className="card p-6 group">
            <div className="text-4xl mb-4">🎫</div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Support</h3>
            <p className="text-gray-500 text-sm">Open a support ticket</p>
          </Link>
        </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="card p-6 text-gray-500 text-sm">No activity yet - your purchases will show up here.</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((tx) => (
                  <div key={tx._id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{TYPE_ICON[tx.type] || '•'}</span>
                      <div>
                        <p className="text-gray-800 font-semibold text-sm">{tx.description}</p>
                        <p className="text-gray-400 text-xs">{timeAgo(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#f97316] font-bold text-sm">₦{tx.amount.toLocaleString()}</span>
                      {tx.type === 'account_purchase' && tx.metadata?.productId && (
                        <Link
                          href={`${tx.metadata.source === 'buyacc2' ? '/logs' : '/accounts'}/${tx.metadata.productId}`}
                          className="text-xs text-gray-500 hover:text-[#f97316] font-semibold whitespace-nowrap"
                        >
                          Buy Again
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
