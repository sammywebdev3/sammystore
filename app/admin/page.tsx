'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORY_LABELS: Record<string, string> = {
  numbers: 'Virtual Numbers (TigerSMS)',
  smm: 'SMM Panel',
  accounts: 'Buy Accounts',
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({ totalUsers: 0, totalWalletBalance: 0, totalTransactions: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [markups, setMarkups] = useState<Record<string, number>>({ numbers: 0, smm: 0, accounts: 0 });
  const [markupInputs, setMarkupInputs] = useState<Record<string, string>>({ numbers: '', smm: '', accounts: '' });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg, setPricingMsg] = useState('');
  const [pricingMsgType, setPricingMsgType] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
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
        body: JSON.stringify(markupInputs)
      });
      const data = await res.json();
      if (data.success) {
        setMarkups(data.markups);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a25] to-[#0f0f16] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#e11d3f] mx-auto mb-4"></div>
          <p className="text-[#25d366] font-mono">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a25] to-[#0f0f16] p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#e11d3f] via-[#8c0018] to-[#25d366] bg-clip-text text-transparent">
            ADMIN DASHBOARD
          </h1>
          <p className="text-[#a0a0b0] font-mono mt-2">{`> SYSTEM_CONTROL_CENTER`}</p>
        </div>
        <Link href="/dashboard" className="px-6 py-3 bg-gradient-to-r from-[#e11d3f] to-[#b3001f] rounded-lg font-bold text-black hover:shadow-[0_0_20px_rgba(225,29,63,0.5)] transition-all">
          {`> EXIT_TO_SITE`}
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#1a1a25] to-[#0f0f16] border border-[#e11d3f]/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(225,29,63,0.3)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#a0a0b0] font-mono text-sm">{`> TOTAL_USERS`}</h3>
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-4xl font-bold text-[#e11d3f]">{stats.totalUsers}</p>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a25] to-[#0f0f16] border border-[#e6a817]/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#a0a0b0] font-mono text-sm">{`> TOTAL_WALLET_BALANCE`}</h3>
            <span className="text-3xl">💰</span>
          </div>
          <p className="text-4xl font-bold text-[#e6a817]">₦{stats.totalWalletBalance.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a25] to-[#0f0f16] border border-[#25d366]/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#a0a0b0] font-mono text-sm">{`> TOTAL_TRANSACTIONS`}</h3>
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-4xl font-bold text-[#25d366]">{stats.totalTransactions}</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-lg border ${msgType === 'success' ? 'border-[#25d366] bg-[#25d366]/10 text-[#25d366]' : 'border-[#e11d3f] bg-[#e11d3f]/10 text-[#e11d3f]'}`}>
          <p className="font-mono font-bold">{msg}</p>
        </div>
      )}

      <div className="flex gap-4 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-lg font-mono font-bold transition-all ${activeTab === 'users' ? 'bg-[#e11d3f] text-black' : 'bg-[#1a1a25] text-[#a0a0b0] border border-[#2a2a3a]'}`}>
          👥 USERS
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 rounded-lg font-mono font-bold transition-all ${activeTab === 'transactions' ? 'bg-[#8c0018] text-white' : 'bg-[#1a1a25] text-[#a0a0b0] border border-[#2a2a3a]'}`}>
           TRANSACTIONS
        </button>
        <button onClick={() => setActiveTab('pricing')} className={`px-6 py-3 rounded-lg font-mono font-bold transition-all ${activeTab === 'pricing' ? 'bg-[#e6a817] text-black' : 'bg-[#1a1a25] text-[#a0a0b0] border border-[#2a2a3a]'}`}>
          💲 PRICING
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-gradient-to-br from-[#1a1a25] to-[#0f0f16] border border-[#2a2a3a] rounded-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-[#e0e0e0] font-mono">{`> REGISTERED_USERS`}</h2>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-[#0f0f16] border border-[#2a2a3a] rounded-lg text-[#e0e0e0] focus:border-[#e11d3f] focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a3a]">
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">USER</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">EMAIL</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">BALANCE</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">STATUS</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-[#2a2a3a] hover:bg-[#1a1a25]/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e11d3f] to-[#8c0018] flex items-center justify-center text-black font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[#e0e0e0]">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#a0a0b0]">{user.email}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-[#e6a817]/10 border border-[#e6a817]/30 rounded-full text-[#e6a817] font-mono">
                        ₦{(user.walletBalance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.suspended ? (
                        <span className="px-3 py-1 bg-[#e11d3f]/10 border border-[#e11d3f]/30 rounded-full text-[#e11d3f] font-mono text-xs">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-[#25d366]/10 border border-[#25d366]/30 rounded-full text-[#25d366] font-mono text-xs">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setModal({ type: 'add', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#25d366]/20 border border-[#25d366]/30 rounded text-[#25d366] text-xs font-mono hover:bg-[#25d366]/30">
                          + ADD
                        </button>
                        <button onClick={() => setModal({ type: 'deduct', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#e11d3f]/20 border border-[#e11d3f]/30 rounded text-[#e11d3f] text-xs font-mono hover:bg-[#e11d3f]/30">
                          - DEDUCT
                        </button>
                        {user.suspended ? (
                          <button onClick={() => setModal({ type: 'unsuspend', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#e11d3f]/20 border border-[#e11d3f]/30 rounded text-[#e11d3f] text-xs font-mono hover:bg-[#e11d3f]/30">
                            UNSUSPEND
                          </button>
                        ) : (
                          <button onClick={() => setModal({ type: 'suspend', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#e6a817]/20 border border-[#e6a817]/30 rounded text-[#e6a817] text-xs font-mono hover:bg-[#e6a817]/30">
                            SUSPEND
                          </button>
                        )}
                        <button onClick={() => setModal({ type: 'delete', userId: user._id, userName: user.name })} className="px-3 py-1 bg-[#e11d3f]/20 border border-[#e11d3f]/30 rounded text-[#e11d3f] text-xs font-mono hover:bg-[#e11d3f]/30">
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
        <div className="bg-gradient-to-br from-[#1a1a25] to-[#0f0f16] border border-[#2a2a3a] rounded-xl p-6">
          <h2 className="text-2xl font-bold text-[#e0e0e0] font-mono mb-6">{`> ALL_TRANSACTIONS`}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a3a]">
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">TYPE</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">DESCRIPTION</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">AMOUNT</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">STATUS</th>
                  <th className="text-left p-4 text-[#e11d3f] font-mono text-sm">DATE</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any) => (
                  <tr key={txn._id} className="border-b border-[#2a2a3a] hover:bg-[#1a1a25]/50">
                    <td className="p-4 text-[#e0e0e0] uppercase font-mono text-xs">{txn.type}</td>
                    <td className="p-4 text-[#a0a0b0] text-sm">{txn.description}</td>
                    <td className="p-4 text-[#e6a817] font-mono">₦{txn.amount?.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${txn.status === 'success' ? 'bg-[#25d366]/10 text-[#25d366]' : txn.status === 'pending' ? 'bg-[#e6a817]/10 text-[#e6a817]' : 'bg-[#e11d3f]/10 text-[#e11d3f]'}`}>
                        {txn.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-[#a0a0b0] text-sm">{new Date(txn.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="bg-gradient-to-br from-[#1a1a25] to-[#0f0f16] border border-[#2a2a3a] rounded-xl p-6">
          <h2 className="text-2xl font-bold text-[#e0e0e0] font-mono mb-2">{`> PRICE_CONTROL`}</h2>
          <p className="text-[#a0a0b0] text-sm mb-6">
            Set the markup percentage added on top of each provider&apos;s raw cost. This is your profit margin -
            it applies automatically everywhere that product&apos;s price is shown or charged. Use a negative
            number to run a discount (down to -99%, so a price can never hit ₦0).
          </p>

          {pricingMsg && (
            <div className={`mb-6 p-4 rounded-lg border ${pricingMsgType === 'success' ? 'border-[#25d366] bg-[#25d366]/10 text-[#25d366]' : 'border-[#e11d3f] bg-[#e11d3f]/10 text-[#e11d3f]'}`}>
              <p className="font-mono font-bold">{pricingMsg}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {Object.keys(CATEGORY_LABELS).map((category) => (
              <div key={category} className="bg-[#0f0f16] border border-[#2a2a3a] rounded-xl p-5">
                <label className="block text-[#e11d3f] font-mono text-sm mb-2">{CATEGORY_LABELS[category]}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={markupInputs[category]}
                    onChange={(e) => setMarkupInputs({ ...markupInputs, [category]: e.target.value })}
                    step="1"
                    className="w-full px-4 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-[#e0e0e0] focus:border-[#e11d3f] focus:outline-none"
                  />
                  <span className="text-[#a0a0b0] font-mono">%</span>
                </div>
                <p className="text-[#a0a0b0] text-xs mt-2 font-mono">
                  Currently live: {markups[category]}% markup
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePricing}
            disabled={pricingSaving}
            className="px-6 py-3 bg-[#e6a817] text-black rounded-lg font-mono font-bold hover:bg-[#e6a817]/80 disabled:opacity-50"
          >
            {pricingSaving ? 'SAVING...' : 'SAVE PRICING'}
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a25] border border-[#2a2a3a] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-[#e0e0e0] mb-4 font-mono">
              {modal.type === 'add' && `➕ Add Money to ${modal.userName}`}
              {modal.type === 'deduct' && `➖ Deduct Money from ${modal.userName}`}
              {modal.type === 'suspend' && `🚫 Suspend ${modal.userName}`}
              {modal.type === 'unsuspend' && `✅ Unsuspend ${modal.userName}`}
              {modal.type === 'delete' && `⚠️ Delete ${modal.userName}?`}
            </h3>

            {(modal.type === 'add' || modal.type === 'deduct') && (
              <>
                <div className="mb-4">
                  <label className="block text-[#e11d3f] text-sm font-mono mb-2">{`> AMOUNT (₦)`}</label>
                  <input
                    type="number"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0f0f16] border border-[#2a2a3a] rounded-lg text-[#e0e0e0] focus:border-[#e11d3f] focus:outline-none"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-[#e11d3f] text-sm font-mono mb-2">{`> REASON (Optional)`}</label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0f0f16] border border-[#2a2a3a] rounded-lg text-[#e0e0e0] focus:border-[#e11d3f] focus:outline-none"
                    placeholder="Reason for transaction"
                  />
                </div>
              </>
            )}

            {modal.type === 'suspend' && (
              <div className="mb-4">
                <label className="block text-[#e6a817] text-sm font-mono mb-2">{`> SUSPENSION_REASON`}</label>
                <textarea
                  value={modalSuspendReason}
                  onChange={(e) => setModalSuspendReason(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0f0f16] border border-[#2a2a3a] rounded-lg text-[#e0e0e0] focus:border-[#e6a817] focus:outline-none"
                  rows={3}
                  placeholder="Why is this user being suspended?"
                />
              </div>
            )}

            {modal.type === 'delete' && (
              <p className="text-[#e11d3f] font-mono mb-4">
                This will permanently delete the user and all their transactions. This action cannot be undone.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={actionLoading || (modalAmount === '' && (modal.type === 'add' || modal.type === 'deduct'))}
                className={`flex-1 py-3 rounded-lg font-bold font-mono transition-all ${
                  modal.type === 'add' ? 'bg-[#25d366] text-black hover:bg-[#25d366]/80' :
                  modal.type === 'deduct' ? 'bg-[#e11d3f] text-white hover:bg-[#e11d3f]/80' :
                  modal.type === 'suspend' ? 'bg-[#e6a817] text-black hover:bg-[#e6a817]/80' :
                  modal.type === 'unsuspend' ? 'bg-[#e11d3f] text-black hover:bg-[#e11d3f]/80' :
                  'bg-[#e11d3f] text-white hover:bg-[#e11d3f]/80'
                } disabled:opacity-50`}
              >
                {actionLoading ? 'PROCESSING...' : 'CONFIRM'}
              </button>
              <button
                onClick={() => { setModal(null); setModalAmount(''); setModalReason(''); setModalSuspendReason(''); }}
                className="px-6 py-3 bg-[#2a2a3a] text-[#a0a0b0] rounded-lg font-mono hover:bg-[#3a3a4a]"
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
