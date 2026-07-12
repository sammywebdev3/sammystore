'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function DashboardPage() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.balance !== undefined) setBalance(data.balance);
    };
    fetchBalance();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-8">
            <p className="terminal-text text-sm mb-2">{`> SYSTEM_ACCESS: GRANTED`}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#e0e0e0]">DASHBOARD</h1>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card-dark bg-gradient-to-br from-[#00f5ff]/10 to-[#0080ff]/10 border-[#00f5ff]/30">
              <h3 className="text-[#00f5ff] text-sm font-mono mb-2">{`> WALLET_BALANCE`}</h3>
              <p className="text-3xl md:text-4xl font-bold text-[#e0e0e0] mb-4">₦{balance.toLocaleString()}.00</p>
              <Link href="/fund" className="btn-neon-green text-sm py-2 px-4 inline-block">
                FUND WALLET
              </Link>
            </div>
            
            <div className="card-dark">
              <h3 className="text-[#b829dd] text-sm font-mono mb-2">{`> TOTAL_TRANSACTIONS`}</h3>
              <p className="text-3xl md:text-4xl font-bold text-[#e0e0e0]">0</p>
            </div>
            
            <div className="card-dark">
              <h3 className="text-[#00ff88] text-sm font-mono mb-2">{`> ACTIVE_NUMBERS`}</h3>
              <p className="text-3xl md:text-4xl font-bold text-[#e0e0e0]">0</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#e0e0e0] mb-6 font-mono">{`> SERVICES`}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/numbers" className="card-dark group">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-xl font-bold mb-2 text-[#00f5ff]">Virtual Numbers</h3>
              <p className="text-[#a0a0b0] text-sm">Rent anonymous numbers</p>
            </Link>
            <Link href="/smm" className="card-dark group">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2 text-[#b829dd]">SMM Panel</h3>
              <p className="text-[#a0a0b0] text-sm">Social media boost</p>
            </Link>
            <Link href="/accounts" className="card-dark group">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-xl font-bold mb-2 text-[#ffd700]">Buy Accounts</h3>
              <p className="text-[#a0a0b0] text-sm">Pre-verified accounts</p>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
