'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORY_LABELS: Record<string, string> = {
  numbers: 'Virtual Numbers (TigerSMS)',
  smm: 'SMM Panel',
  accounts: 'Buy Accounts',
};

const BENOTP_POOL_LABELS: { key: string; label: string }[] = [
  { key: 'usa1', label: 'BenOTP - USA Server 1' },
  { key: 'usa2', label: 'BenOTP - USA Server 2' },
  { key: 'all1', label: 'BenOTP - All Countries 1' },
  { key: 'all2', label: 'BenOTP - All Countries 2' },
];

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({ totalUsers: 0, totalWalletBalance: 0, totalTransactions: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [markups, setMarkups] = useState<Record<string, number>>({ numbers: 0, smm: 0, accounts: 0 });
  const [markupInputs, setMarkupInputs] = useState<Record<string, string>>({ numbers: '', smm: '', accounts: '' });
  const [benotpPrices, setBenotpPrices] = useState<Record<string, number>>({ usa1: 0, usa2: 0, all1: 0, all2: 0 });
  const [benotpPriceInputs, setBenotpPriceInputs] = useState<Record<string, string>>({ usa1: '', usa2: '', all1: '', all2: '' });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg, setPricingMsg] = useState('');
  const [pricingMsgType, setPricingMsgType] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [txnSearchTerm, setTxnSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [viewUser, setViewUser] = useState<any>(null);
  const [modal, setModal] = useState<{ type: string; userId?: string; userName?: string } | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [modalSuspendReason, setModalSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/admin/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        router.push('/dashboard');
      } else {
        fetchData();
        fetchPricing();
      }
    };
    checkAdmin();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, txnRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders() }),
        fetch('/api/admin/users', { headers: authHeaders() }),
        fetch('/api/admin/transactions', { headers: authHeaders() })
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const txnData = await txnRes.json();

      if (statsData.success) setStats(statsData);
      if (usersData.success) setUsers(usersData.users);
      if (txnData.success) setTransactions(txnData.transactions);
    } catch (error) {
      console.error('Admin fetch error:', error);
    }
    setLoading(false);
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/admin/pricing', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setMarkups(data.markups);
        setMarkupInputs({
          numbers: String(data.markups.numbers),
          smm: String(data.markups.smm),
          accounts: String(data.markups.accounts),
        });
        if (data.benotpPrices) {
          setBenotpPrices(data.benotpPrices);
          setBenotpPriceInputs({
            usa1: String(data.benotpPrices.usa1),
            usa2: String(data.benotpPrices.usa2),
            all1: String(data.benotpPrices.all1),
            all2: String(data.benotpPrices.all2),
          });
        }
      }
    } catch (error) {
      console.error('Pricing fetch error:', error);
    }
  };

  const handleSavePricing = async () => {
    setPricingSaving(true);
    setPricingMsg('');
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...markupInputs, benotpPrices: benotpPriceInputs })
      });
      const data = await res.json();
      if (data.success) {
        setMarkups(data.markups);
        if (data.benotpPrices) setBenotpPrices(data.benotpPrices);
        setPricingMsgType('success');
        setPricingMsg('Pricing updated successfully!');
      } else {
        setPricingMsgType('error');
        setPricingMsg(data.error || 'Failed to update pricing');
      }
    } catch (error: any) {
      setPricingMsgType('error');
      setPricingMsg('Network error: ' + error.message);
    }
    setPricingSaving(false);
  };

  const handleAction = async () => {
    if (!modal) return;
    setActionLoading(true);
    setMsg('');

    try {
      let endpoint = '';
      let body: any = {};

      if (modal.type === 'add') {
        endpoint = '/api/admin/add-money';
        body = { userId: modal.userId, amount: modalAmount, reason: modalReason };
      } else if (modal.type === 'deduct') {
        endpoint = '/api/admin/deduct-money';
        body = { userId: modal.userId, amount: modalAmount, reason: modalReason };
      } else if (modal.type === 'suspend') {
        endpoint = '/api/admin/suspend';
        body = { userId: modal.userId, suspended: true, reason: modalSuspendReason };
      } else if (modal.type === 'unsuspend') {
        endpoint = '/api/admin/suspend';
        body = { userId: modal.userId, suspended: false, reason: '' };
      } else if (modal.type === 'delete') {
        endpoint = '/api/admin/delete-user';
        body = { userId: modal.userId };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setMsgType('success');
        setMsg(data.message || 'Action completed successfully!');
        setModal(null);
        setModalAmount('');
        setModalReason('');
        setModalSuspendReason('');
        fetchData();
      } else {
        setMsgType('error');
        setMsg(data.error || 'Action failed');
      }
    } catch (error: any) {
      setMsgType('error');
      setMsg('Network error: ' + error.message);
    }
    setActionLoading(false);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter((txn: any) => {
    const q = txnSearchTerm.toLowerCase();
    if (!q) return true;
    return (
      (txn.userName || '').toLowerCase().includes(q) ||
      (txn.userEmail || '').toLowerCase().includes(q) ||
      (txn.description || '').toLowerCase().includes(q) ||
      (txn.type || '').toLowerCase().includes(q)
    );
  });

  const userTransactions = (userId: string) =>
    transactions.filter((txn: any) => String(txn.userId) === String(userId));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-green-600 font-mono">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#fb923c] via-[#ea580c] to-green-400 bg-clip-text text-transparent">
            ADMIN DASHBOARD
          </h1>
          <p className="text-gray-500 font-mono mt-2">{`> SYSTEM_CONTROL_CENTER`}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/catalog" className="px-6 py-3 bg-white border-2 border-[#f97316] rounded-lg font-bold text-[#f97316] hover:bg-orange-50 transition-all">
            {`> MY_CATALOG`}
          </Link>
          <Link href="/dashboard" className="px-6 py-3 bg-gradient-to-r from-[#fb923c] to-[#f97316] rounded-lg font-bold text-black hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all">
            {`> EXIT_TO_SITE`}
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-[#f97316]/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-mono text-sm">{`> TOTAL_USERS`}</h3>
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-4xl font-bold text-[#f97316]">{stats.totalUsers}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-amber-300/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-mono text-sm">{`> TOTAL_WALLET_BALANCE`}</h3>
            <span className="text-3xl">💰</span>
          </div>
          <p className="text-4xl font-bold text-amber-600">₦{stats.totalWalletBalance.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-green-300/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-mono text-sm">{`> TOTAL_TRANSACTIONS`}</h3>
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-4xl font-bold text-green-600">{stats.totalTransactions}</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-lg border ${msgType === 'success' ? 'border-green-300 bg-green-500/10 text-green-600' : 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]'}`}>
          <p className="font-mono font-bold">{msg}</p>
        </div>
      )}

      <div className="flex gap-4 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-lg font-mono font-bold transition-all ${activeTab === 'users' ? 'bg-[#f97316] text-black' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
          👥 USERS
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 rounded-lg font-mono font-bold transition-all ${activeTab === 'transactions' ? 'bg-[#ea580c] text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
           TRANSACTIONS
        </button>
        <button onClick={() => setActiveTab('pricing')} className={`px-6 py-3 rounded-lg font-mono font-bold transition-all ${activeTab === 'pricing' ? 'bg-amber-500 text-black' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
          💲 PRICING
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 font-mono">{`> REGISTERED_USERS`}</h2>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:border-[#f97316] focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">USER</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">EMAIL</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">BALANCE</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">STATUS</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fb923c] to-[#ea580c] flex items-center justify-center text-black font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-800">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500">{user.email}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-300/30 rounded-full text-amber-600 font-mono">
                        ₦{(user.walletBalance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.suspended ? (
                        <span className="px-3 py-1 bg-[#f97316]/10 border border-[#f97316]/30 rounded-full text-[#f97316] font-mono text-xs">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/10 border border-green-300/30 rounded-full text-green-600 font-mono text-xs">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setViewUser(user)} className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-gray-700 text-xs font-mono hover:bg-gray-200">
                          VIEW
                        </button>
                        <button onClick={() => setModal({ type: 'add', userId: user._id, userName: user.name })} className="px-3 py-1 bg-green-500/20 border border-green-300/30 rounded text-green-600 text-xs font-mono hover:bg-green-500/30">
                          + ADD
                        </button>
                        <button onClick={() => setModal({ type: 'deduct', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#f97316]/20 border border-[#f97316]/30 rounded text-[#f97316] text-xs font-mono hover:bg-[#f97316]/30">
                          - DEDUCT
                        </button>
                        {user.suspended ? (
                          <button onClick={() => setModal({ type: 'unsuspend', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#f97316]/20 border border-[#f97316]/30 rounded text-[#f97316] text-xs font-mono hover:bg-[#f97316]/30">
                            UNSUSPEND
                          </button>
                        ) : (
                          <button onClick={() => setModal({ type: 'suspend', userId: user._id, userName: user.name })} className="px-3 py-1 bg-amber-500/20 border border-amber-300/30 rounded text-amber-600 text-xs font-mono hover:bg-amber-500/30">
                            SUSPEND
                          </button>
                        )}
                        <button onClick={() => setModal({ type: 'delete', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#f97316]/20 border border-[#f97316]/30 rounded text-[#f97316] text-xs font-mono hover:bg-[#f97316]/30">
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 font-mono">{`> ALL_ORDERS_&_TRANSACTIONS`}</h2>
            <input
              type="text"
              placeholder="Search by user, email, type..."
              value={txnSearchTerm}
              onChange={(e) => setTxnSearchTerm(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:border-[#f97316] focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">USER</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">TYPE</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">DESCRIPTION</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">AMOUNT</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">STATUS</th>
                  <th className="text-left p-4 text-[#f97316] font-mono text-sm">DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn: any) => (
                  <tr key={txn._id} className="border-b border-gray-200 hover:bg-gray-50/50">
                    <td className="p-4 text-sm">
                      <div className="text-gray-800 font-semibold">{txn.userName}</div>
                      <div className="text-gray-500 text-xs">{txn.userEmail}</div>
                    </td>
                    <td className="p-4 text-gray-800 uppercase font-mono text-xs">{txn.type}</td>
                    <td className="p-4 text-gray-500 text-sm">{txn.description}</td>
                    <td className="p-4 text-amber-600 font-mono">₦{txn.amount?.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${txn.status === 'success' ? 'bg-green-500/10 text-green-600' : txn.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-[#f97316]/10 text-[#f97316]'}`}>
                        {txn.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{new Date(txn.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 text-sm">No matching transactions.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 font-mono">{viewUser.name}</h3>
                <p className="text-gray-500 text-sm">{viewUser.email}</p>
              </div>
              <button onClick={() => setViewUser(null)} className="text-gray-500 hover:text-gray-800 text-xl leading-none">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 font-mono">BALANCE</p>
                <p className="text-lg font-bold text-amber-600">₦{(viewUser.walletBalance || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 font-mono">STATUS</p>
                <p className={`text-lg font-bold ${viewUser.suspended ? 'text-[#f97316]' : 'text-green-600'}`}>{viewUser.suspended ? 'SUSPENDED' : 'ACTIVE'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 font-mono">JOINED</p>
                <p className="text-sm font-bold text-gray-800">{viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleDateString() : '-'}</p>
              </div>
            </div>

            {viewUser.suspended && viewUser.suspendReason && (
              <p className="text-sm text-[#f97316] mb-4">Suspend reason: {viewUser.suspendReason}</p>
            )}

            <h4 className="text-gray-800 font-mono font-bold mb-3">{`> ORDER_HISTORY`}</h4>
            <div className="space-y-2">
              {userTransactions(viewUser._id).length === 0 && (
                <p className="text-gray-500 text-sm">No transactions yet.</p>
              )}
              {userTransactions(viewUser._id).map((txn: any) => (
                <div key={txn._id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="text-gray-800 font-semibold">{txn.description}</p>
                    <p className="text-gray-500 text-xs uppercase font-mono">{txn.type} · {new Date(txn.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-600 font-mono">₦{txn.amount?.toLocaleString()}</p>
                    <span className={`text-xs font-mono ${txn.status === 'success' ? 'text-green-600' : txn.status === 'pending' ? 'text-amber-600' : 'text-[#f97316]'}`}>
                      {txn.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 font-mono mb-2">{`> PRICE_CONTROL`}</h2>
          <p className="text-gray-500 text-sm mb-6">
            Set the markup percentage added on top of each provider&apos;s raw cost. This is your profit margin -
            it applies automatically everywhere that product&apos;s price is shown or charged. Use a negative
            number to run a discount (down to -99%, so a price can never hit ₦0).
          </p>

          {pricingMsg && (
            <div className={`mb-6 p-4 rounded-lg border ${pricingMsgType === 'success' ? 'border-green-300 bg-green-500/10 text-green-600' : 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]'}`}>
              <p className="font-mono font-bold">{pricingMsg}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {Object.keys(CATEGORY_LABELS).map((category) => (
              <div key={category} className="bg-white border border-gray-200 rounded-xl p-5">
                <label className="block text-[#f97316] font-mono text-sm mb-2">{CATEGORY_LABELS[category]}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={markupInputs[category]}
                    onChange={(e) => setMarkupInputs({ ...markupInputs, [category]: e.target.value })}
                    step="1"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:border-[#f97316] focus:outline-none"
                  />
                  <span className="text-gray-500 font-mono">%</span>
                </div>
                <p className="text-gray-500 text-xs mt-2 font-mono">
                  Currently live: {markups[category]}% markup
                </p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold text-gray-800 font-mono mb-2">{`> BENOTP_FALLBACK_PRICE (flat price per number)`}</h3>
          <p className="text-gray-500 text-sm mb-4">
            All four BenOTP pools now have live per-service pricing and are charged using the &quot;Virtual
            Numbers&quot; markup % above. This flat NGN price is only used as a fallback if a live price lookup
            fails for some reason - it&apos;s no longer the normal price on any pool.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {BENOTP_POOL_LABELS.map((pool) => (
              <div key={pool.key} className="bg-white border border-gray-200 rounded-xl p-5">
                <label className="block text-[#f97316] font-mono text-sm mb-2">{pool.label}</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-mono">₦</span>
                  <input
                    type="number"
                    value={benotpPriceInputs[pool.key]}
                    onChange={(e) => setBenotpPriceInputs({ ...benotpPriceInputs, [pool.key]: e.target.value })}
                    step="1"
                    min="1"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:border-[#f97316] focus:outline-none"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2 font-mono">
                  Currently live: ₦{benotpPrices[pool.key]}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePricing}
            disabled={pricingSaving}
            className="px-6 py-3 bg-amber-500 text-black rounded-lg font-mono font-bold hover:bg-amber-500/80 disabled:opacity-50"
          >
            {pricingSaving ? 'SAVING...' : 'SAVE PRICING'}
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4 font-mono">
              {modal.type === 'add' && `➕ Add Money to ${modal.userName}`}
              {modal.type === 'deduct' && `➖ Deduct Money from ${modal.userName}`}
              {modal.type === 'suspend' && `🚫 Suspend ${modal.userName}`}
              {modal.type === 'unsuspend' && `✅ Unsuspend ${modal.userName}`}
              {modal.type === 'delete' && `⚠️ Delete ${modal.userName}?`}
            </h3>

            {(modal.type === 'add' || modal.type === 'deduct') && (
              <>
                <div className="mb-4">
                  <label className="block text-[#f97316] text-sm font-mono mb-2">{`> AMOUNT (₦)`}</label>
                  <input
                    type="number"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:border-[#f97316] focus:outline-none"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-[#f97316] text-sm font-mono mb-2">{`> REASON (Optional)`}</label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:border-[#f97316] focus:outline-none"
                    placeholder="Reason for transaction"
                  />
                </div>
              </>
            )}

            {modal.type === 'suspend' && (
              <div className="mb-4">
                <label className="block text-amber-600 text-sm font-mono mb-2">{`> SUSPENSION_REASON`}</label>
                <textarea
                  value={modalSuspendReason}
                  onChange={(e) => setModalSuspendReason(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:border-amber-300 focus:outline-none"
                  rows={3}
                  placeholder="Why is this user being suspended?"
                />
              </div>
            )}

            {modal.type === 'delete' && (
              <p className="text-[#f97316] font-mono mb-4">
                This will permanently delete the user and all their transactions. This action cannot be undone.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={actionLoading || (modalAmount === '' && (modal.type === 'add' || modal.type === 'deduct'))}
                className={`flex-1 py-3 rounded-lg font-bold font-mono transition-all ${
                  modal.type === 'add' ? 'bg-green-500 text-black hover:bg-green-500/80' :
                  modal.type === 'deduct' ? 'bg-[#f97316] text-white hover:bg-[#f97316]/80' :
                  modal.type === 'suspend' ? 'bg-amber-500 text-black hover:bg-amber-500/80' :
                  modal.type === 'unsuspend' ? 'bg-[#f97316] text-black hover:bg-[#f97316]/80' :
                  'bg-[#f97316] text-white hover:bg-[#f97316]/80'
                } disabled:opacity-50`}
              >
                {actionLoading ? 'PROCESSING...' : 'CONFIRM'}
              </button>
              <button
                onClick={() => { setModal(null); setModalAmount(''); setModalReason(''); setModalSuspendReason(''); }}
                className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-mono hover:bg-gray-200"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
