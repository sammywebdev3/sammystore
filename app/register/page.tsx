'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success) {
        setMsg('Success! Redirecting to login...');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setMsg(data.error);
      }
    } catch (error) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="card-dark w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-2">
          <span className="text-[#00f5ff]">SAMMY</span><span className="text-[#b829dd]">STORE</span>
        </h2>
        <p className="text-center text-[#a0a0b0] mb-8 font-mono text-sm">{`> NEW USER REGISTRATION`}</p>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> ALIAS (NAME)`}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-dark" required />
          </div>
          <div>
            <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> EMAIL_ADDRESS`}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" required />
          </div>
          <div>
            <label className="block text-[#00f5ff] text-sm font-mono mb-2">{`> PASSWORD`}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-dark" required />
          </div>
          <button type="submit" disabled={loading} className="btn-neon w-full mt-4">
            {loading ? 'INITIALIZING...' : 'CREATE ACCOUNT'}
          </button>
        </form>
        {msg && <p className={`mt-4 text-center font-mono text-sm ${msg.includes('Success') ? 'text-[#00ff88]' : 'text-[#ff2a6d]'}`}>{msg}</p>}
        <p className="text-center text-[#a0a0b0] mt-6 text-sm">
          Already have access? <Link href="/login" className="text-[#00f5ff] hover:underline">Login Here</Link>
        </p>
      </div>
    </div>
  );
}
